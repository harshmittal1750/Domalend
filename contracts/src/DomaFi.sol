// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RewardsDistributor.sol";

// Interface for the Doma Ownership Token, which has non-standard functions
interface IDomaOwnershipToken is IERC721 {
    function expirationOf(uint256 id) external view returns (uint256);

    function lockStatusOf(uint256 id) external view returns (bool);
}

// Interface for our new custom domain valuation oracle
interface IDomainValuationOracle {
    function getDomainValue(
        address _domainContract,
        uint256 _tokenId
    ) external view returns (uint256 valueUSD);
}

/**
 * @title DomaFi
 * @dev A specialized lending protocol for borrowing ERC20 tokens against Doma Protocol's tokenized domain NFTs
 * @notice This contract enables leveraged accumulation loops for domain investors
 */
contract DomaFi is ReentrancyGuard, Ownable, IERC721Receiver {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum LoanStatus {
        Pending,
        Active,
        Repaid,
        Defaulted,
        Cancelled
    }

    // ============ Structs ============

    struct Loan {
        uint256 id;
        address lender;
        address borrower;
        address tokenAddress; // Token to borrow (e.g., USDC)
        uint256 amount; // Amount of tokens to borrow
        uint256 interestRate; // Basis points (e.g., 500 = 5%)
        uint256 duration; // Duration in seconds
        address collateralContract; // Doma Ownership Token contract address
        uint256 collateralTokenId; // Specific domain NFT ID
        uint256 startTime;
        LoanStatus status;
        uint256 minCollateralRatioBPS; // Minimum required collateralization ratio (e.g., 15000 for 150%)
        uint256 liquidationThresholdBPS; // Collateralization ratio below which loan can be liquidated (e.g., 12000 for 120%)
        uint256 repaidAmount; // Amount already repaid (for partial repayments)
    }

    // ============ Constants ============

    // Default collateralization ratios
    uint256 public constant DEFAULT_MIN_COLLATERAL_RATIO_BPS = 15000; // 150%
    uint256 public constant DEFAULT_LIQUIDATION_THRESHOLD_BPS = 12000; // 120%

    // ============ State Variables ============

    uint256 public nextLoanId = 1;

    // Mappings for efficient loan management
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public lenderLoans;
    mapping(address => uint256[]) public borrowerLoans;

    // Array to efficiently query open loan requests
    uint256[] public activeLoanRequestIds;

    // Mapping to track position of loan ID in activeLoanRequestIds array for O(1) removal
    mapping(uint256 => uint256) private activeLoanRequestIndex;

    // Domain valuation oracle
    IDomainValuationOracle public domainValuationOracle;

    // Rewards distributor contract for liquidity mining
    RewardsDistributor public rewardsDistributor;

    // Mapping to track which Doma contracts are approved
    mapping(address => bool) public approvedDomaContracts;

    // ============ Events ============

    event LoanRequestCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed collateralContract,
        uint256 collateralTokenId,
        address tokenToBorrow,
        uint256 amountToBorrow,
        uint256 interestRate,
        uint256 duration,
        uint256 minCollateralRatioBPS,
        uint256 liquidationThresholdBPS
    );

    event LoanFunded(
        uint256 indexed loanId,
        address indexed lender,
        uint256 timestamp,
        uint256 initialCollateralRatio
    );

    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 repaymentAmount,
        uint256 timestamp
    );

    event LoanLiquidated(
        uint256 indexed loanId,
        address indexed liquidator,
        uint256 timestamp
    );

    event LoanRequestCancelled(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 timestamp
    );

    event LoanRequestRemoved(uint256 indexed loanId, string reason);

    event DomainValuationOracleSet(
        address indexed oldOracle,
        address indexed newOracle
    );

    event RewardsDistributorSet(
        address indexed oldDistributor,
        address indexed newDistributor
    );

    event DomaContractApproved(address indexed domaContract, bool approved);

    event PartialRepayment(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 repaymentAmount,
        uint256 totalRepaidAmount,
        uint256 remainingAmount,
        uint256 timestamp
    );

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Administration Functions ============

    /**
     * @notice Sets the domain valuation oracle contract
     * @dev Only callable by the contract owner
     * @param _oracleAddress The address of the IDomainValuationOracle contract
     */
    function setDomainValuationOracle(
        address _oracleAddress
    ) external onlyOwner {
        require(_oracleAddress != address(0), "Invalid oracle address");
        address oldOracle = address(domainValuationOracle);
        domainValuationOracle = IDomainValuationOracle(_oracleAddress);
        emit DomainValuationOracleSet(oldOracle, _oracleAddress);
    }

    /**
     * @notice Sets the rewards distributor contract for liquidity mining
     * @dev Only callable by the contract owner
     * @param _distributorAddress The address of the RewardsDistributor contract
     */
    function setRewardsDistributor(
        address _distributorAddress
    ) external onlyOwner {
        require(
            _distributorAddress != address(0),
            "Invalid distributor address"
        );
        address oldDistributor = address(rewardsDistributor);
        rewardsDistributor = RewardsDistributor(payable(_distributorAddress));
        emit RewardsDistributorSet(oldDistributor, _distributorAddress);
    }

    /**
     * @notice Approve or revoke approval for a Doma Ownership Token contract
     * @dev Only callable by the contract owner
     * @param _domaContract The address of the Doma Ownership Token contract
     * @param _approved Whether to approve or revoke approval
     */
    function setDomaContractApproval(
        address _domaContract,
        bool _approved
    ) external onlyOwner {
        require(_domaContract != address(0), "Invalid contract address");
        approvedDomaContracts[_domaContract] = _approved;
        emit DomaContractApproved(_domaContract, _approved);
    }

    // ============ External Functions ============

    /**
     * @notice Creates a new loan request by borrower pledging their domain NFT
     * @param _collateralContract Address of the Doma Ownership Token contract
     * @param _collateralTokenId ID of the domain NFT to use as collateral
     * @param _tokenToBorrow Address of the ERC20 token to borrow (e.g., USDC)
     * @param _amountToBorrow Amount of tokens to borrow
     * @param _interestRateBPS Interest rate in basis points (e.g., 500 = 5%)
     * @param _duration Loan duration in seconds
     */
    function createLoanRequest(
        address _collateralContract,
        uint256 _collateralTokenId,
        address _tokenToBorrow,
        uint256 _amountToBorrow,
        uint256 _interestRateBPS,
        uint256 _duration
    ) external nonReentrant {
        _createLoanRequestInternal(
            _collateralContract,
            _collateralTokenId,
            _tokenToBorrow,
            _amountToBorrow,
            _interestRateBPS,
            _duration,
            DEFAULT_MIN_COLLATERAL_RATIO_BPS,
            DEFAULT_LIQUIDATION_THRESHOLD_BPS
        );
    }

    /**
     * @notice Creates a new loan request with custom collateral ratios
     * @param _collateralContract Address of the Doma Ownership Token contract
     * @param _collateralTokenId ID of the domain NFT to use as collateral
     * @param _tokenToBorrow Address of the ERC20 token to borrow (e.g., USDC)
     * @param _amountToBorrow Amount of tokens to borrow
     * @param _interestRateBPS Interest rate in basis points (e.g., 500 = 5%)
     * @param _duration Loan duration in seconds
     * @param _minCollateralRatioBPS Minimum acceptable collateral ratio (e.g., 15000 for 150%)
     * @param _liquidationThresholdBPS Collateral ratio below which loan can be liquidated (e.g., 12000 for 120%)
     */
    function createLoanRequest(
        address _collateralContract,
        uint256 _collateralTokenId,
        address _tokenToBorrow,
        uint256 _amountToBorrow,
        uint256 _interestRateBPS,
        uint256 _duration,
        uint256 _minCollateralRatioBPS,
        uint256 _liquidationThresholdBPS
    ) external nonReentrant {
        _createLoanRequestInternal(
            _collateralContract,
            _collateralTokenId,
            _tokenToBorrow,
            _amountToBorrow,
            _interestRateBPS,
            _duration,
            _minCollateralRatioBPS,
            _liquidationThresholdBPS
        );
    }

    /**
     * @notice Internal function to create loan requests (shared logic)
     */
    function _createLoanRequestInternal(
        address _collateralContract,
        uint256 _collateralTokenId,
        address _tokenToBorrow,
        uint256 _amountToBorrow,
        uint256 _interestRateBPS,
        uint256 _duration,
        uint256 _minCollateralRatioBPS,
        uint256 _liquidationThresholdBPS
    ) internal {
        // Input validation
        require(
            _collateralContract != address(0),
            "Invalid collateral contract"
        );
        require(
            approvedDomaContracts[_collateralContract],
            "Doma contract not approved"
        );
        require(_tokenToBorrow != address(0), "Invalid token address");
        require(_amountToBorrow > 0, "Amount must be greater than 0");
        require(_interestRateBPS > 0, "Interest rate must be greater than 0");
        require(_interestRateBPS <= 10000, "Interest rate cannot exceed 100%");
        require(_duration > 0, "Duration must be greater than 0");
        require(_duration <= 365 days, "Duration cannot exceed 1 year");

        // Collateralization parameters validation
        require(
            _minCollateralRatioBPS >= _liquidationThresholdBPS,
            "Min ratio must be >= liquidation threshold"
        );
        require(
            _liquidationThresholdBPS > 10000,
            "Liquidation threshold must be > 100%"
        );

        // Verify borrower owns the NFT
        IDomaOwnershipToken domaToken = IDomaOwnershipToken(
            _collateralContract
        );
        require(
            domaToken.ownerOf(_collateralTokenId) == msg.sender,
            "Borrower must own the NFT"
        );

        // Check domain status - must not be locked and must not be expired
        require(
            !domaToken.lockStatusOf(_collateralTokenId),
            "Domain is locked"
        );
        require(
            domaToken.expirationOf(_collateralTokenId) > block.timestamp,
            "Domain has expired"
        );

        // Get the current loan ID and increment for next use
        uint256 currentLoanId = nextLoanId;
        nextLoanId++;

        // Transfer domain NFT from borrower to contract (escrow)
        domaToken.safeTransferFrom(
            msg.sender,
            address(this),
            _collateralTokenId
        );

        // Create new loan struct
        Loan memory newLoan = Loan({
            id: currentLoanId,
            lender: address(0), // No lender yet
            borrower: msg.sender,
            tokenAddress: _tokenToBorrow,
            amount: _amountToBorrow,
            interestRate: _interestRateBPS,
            duration: _duration,
            collateralContract: _collateralContract,
            collateralTokenId: _collateralTokenId,
            startTime: 0, // Will be set when loan is funded
            status: LoanStatus.Pending,
            minCollateralRatioBPS: _minCollateralRatioBPS,
            liquidationThresholdBPS: _liquidationThresholdBPS,
            repaidAmount: 0
        });

        // Store the loan
        loans[currentLoanId] = newLoan;

        // Add to active loan requests
        activeLoanRequestIds.push(currentLoanId);

        // Track position in activeLoanRequestIds for O(1) removal
        activeLoanRequestIndex[currentLoanId] = activeLoanRequestIds.length - 1;

        // Update borrower's loan mapping
        borrowerLoans[msg.sender].push(currentLoanId);

        // Emit event
        emit LoanRequestCreated(
            currentLoanId,
            msg.sender,
            _collateralContract,
            _collateralTokenId,
            _tokenToBorrow,
            _amountToBorrow,
            _interestRateBPS,
            _duration,
            _minCollateralRatioBPS,
            _liquidationThresholdBPS
        );
    }

    /**
     * @notice Cancels a pending loan request and returns NFT to borrower
     * @param loanId The ID of the loan request to cancel
     */
    function cancelLoanRequest(uint256 loanId) external nonReentrant {
        // Verify loan exists and is in pending status
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Pending, "Loan is not pending");
        require(msg.sender == loan.borrower, "Only borrower can cancel");

        // Return NFT to borrower
        IDomaOwnershipToken(loan.collateralContract).safeTransferFrom(
            address(this),
            loan.borrower,
            loan.collateralTokenId
        );

        // Update loan status
        loan.status = LoanStatus.Cancelled;

        // Remove from active loan requests
        _removeLoanFromActiveRequests(loanId);

        // Emit event
        emit LoanRequestCancelled(loanId, msg.sender, block.timestamp);
    }

    /**
     * @notice Funds an existing loan request
     * @param loanId The ID of the loan request to fund
     */
    function fundLoanRequest(uint256 loanId) external nonReentrant {
        // Verify loan exists and is in pending status
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Pending, "Loan is not pending");
        require(msg.sender != loan.borrower, "Borrower cannot fund own loan");

        // Verify domain hasn't expired or been locked since request creation
        IDomaOwnershipToken domaToken = IDomaOwnershipToken(
            loan.collateralContract
        );
        require(
            !domaToken.lockStatusOf(loan.collateralTokenId),
            "Domain is locked"
        );
        require(
            domaToken.expirationOf(loan.collateralTokenId) > block.timestamp,
            "Domain has expired"
        );

        // Check if oracle is available for collateral ratio calculation
        if (address(domainValuationOracle) != address(0)) {
            uint256 currentRatio = _getCollateralizationRatio(loanId);
            require(
                currentRatio >= loan.minCollateralRatioBPS,
                "Insufficient collateral based on current valuation"
            );
        }

        // Transfer loan amount from lender to borrower
        IERC20(loan.tokenAddress).safeTransferFrom(
            msg.sender,
            loan.borrower,
            loan.amount
        );

        // Update loan details
        loan.lender = msg.sender;
        loan.startTime = block.timestamp;
        loan.status = LoanStatus.Active;

        // Start rewards for both lender and borrower if rewards distributor is set
        if (address(rewardsDistributor) != address(0)) {
            rewardsDistributor.startAccruingRewards(loan.lender, loan.amount);
            rewardsDistributor.startAccruingRewards(loan.borrower, loan.amount);
        }

        // Remove from active loan requests array
        _removeLoanFromActiveRequests(loanId);

        // Add to lender's loan mapping
        lenderLoans[msg.sender].push(loanId);

        // Emit event with collateral ratio (0 if oracle not available)
        uint256 eventCollateralRatio = 0;
        if (address(domainValuationOracle) != address(0)) {
            eventCollateralRatio = _getCollateralizationRatio(loanId);
        }
        emit LoanFunded(
            loanId,
            msg.sender,
            block.timestamp,
            eventCollateralRatio
        );
    }

    /**
     * @notice Repays an active loan
     * @param loanId The ID of the loan to repay
     */
    function repayLoan(uint256 loanId) external nonReentrant {
        // Verify loan exists and is active
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan is not active");
        require(msg.sender == loan.borrower, "Only borrower can repay");

        // Calculate interest based on time elapsed
        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 annualizedAmount = (loan.amount * loan.interestRate) / 10000;
        uint256 interest = (annualizedAmount * timeElapsed) / 31557600; // 365.25 days in seconds

        uint256 totalRepayment = loan.amount + interest;

        // Stop rewards for both lender and borrower BEFORE changing loan status
        if (address(rewardsDistributor) != address(0)) {
            rewardsDistributor.stopAccruingRewards(loan.lender, loan.amount);
            rewardsDistributor.stopAccruingRewards(loan.borrower, loan.amount);
        }

        // Transfer repayment from borrower to lender
        IERC20(loan.tokenAddress).safeTransferFrom(
            msg.sender,
            loan.lender,
            totalRepayment
        );

        // Return NFT to borrower
        IDomaOwnershipToken(loan.collateralContract).safeTransferFrom(
            address(this),
            loan.borrower,
            loan.collateralTokenId
        );

        // Update loan status
        loan.status = LoanStatus.Repaid;

        // Emit event
        emit LoanRepaid(loanId, msg.sender, totalRepayment, block.timestamp);
    }

    /**
     * @notice Allows borrower to make a partial repayment on an active loan
     * @param loanId The ID of the loan to make partial repayment on
     * @param repaymentAmount Amount to repay (principal + interest portion)
     */
    function makePartialRepayment(
        uint256 loanId,
        uint256 repaymentAmount
    ) external nonReentrant {
        // Verify loan exists and is active
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan is not active");
        require(
            msg.sender == loan.borrower,
            "Only borrower can make repayment"
        );
        require(repaymentAmount > 0, "Repayment amount must be greater than 0");

        // Calculate current total owed (principal + interest)
        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 annualizedAmount = (loan.amount * loan.interestRate) / 10000;
        uint256 totalInterest = (annualizedAmount * timeElapsed) / 31557600;
        uint256 totalOwed = loan.amount + totalInterest;
        uint256 remainingOwed = totalOwed - loan.repaidAmount;

        require(
            repaymentAmount <= remainingOwed,
            "Repayment amount exceeds remaining debt"
        );

        // Transfer repayment from borrower to lender
        IERC20(loan.tokenAddress).safeTransferFrom(
            msg.sender,
            loan.lender,
            repaymentAmount
        );

        // Update repaid amount
        loan.repaidAmount += repaymentAmount;
        uint256 newRemainingAmount = remainingOwed - repaymentAmount;

        // If fully repaid, return NFT and mark as repaid
        if (newRemainingAmount == 0) {
            // Stop rewards for both lender and borrower BEFORE changing loan status
            if (address(rewardsDistributor) != address(0)) {
                rewardsDistributor.stopAccruingRewards(
                    loan.lender,
                    loan.amount
                );
                rewardsDistributor.stopAccruingRewards(
                    loan.borrower,
                    loan.amount
                );
            }

            // Return NFT to borrower
            IDomaOwnershipToken(loan.collateralContract).safeTransferFrom(
                address(this),
                loan.borrower,
                loan.collateralTokenId
            );

            // Update loan status
            loan.status = LoanStatus.Repaid;

            // Emit full repayment event
            emit LoanRepaid(
                loanId,
                msg.sender,
                loan.repaidAmount,
                block.timestamp
            );
        }

        // Emit partial repayment event
        emit PartialRepayment(
            loanId,
            msg.sender,
            repaymentAmount,
            loan.repaidAmount,
            newRemainingAmount,
            block.timestamp
        );
    }

    /**
     * @notice Liquidates a defaulted loan (can be called by anyone after default)
     * @param loanId The ID of the loan to liquidate
     */
    function liquidateLoan(uint256 loanId) external nonReentrant {
        // Verify loan exists and is active
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan is not active");

        // Check for default conditions
        bool timeDefaulted = block.timestamp > loan.startTime + loan.duration;
        bool priceDefaulted = false;

        // Check for price-based default only if oracle is available
        if (address(domainValuationOracle) != address(0)) {
            uint256 currentRatio = _getCollateralizationRatio(loanId);
            priceDefaulted = currentRatio < loan.liquidationThresholdBPS;
        }

        require(
            timeDefaulted || priceDefaulted,
            "Loan has not defaulted yet (time or price)"
        );

        // Stop rewards for both lender and borrower BEFORE changing loan status
        if (address(rewardsDistributor) != address(0)) {
            rewardsDistributor.stopAccruingRewards(loan.lender, loan.amount);
            rewardsDistributor.stopAccruingRewards(loan.borrower, loan.amount);
        }

        // Transfer NFT to lender (simplified - no liquidator fee for NFTs)
        IDomaOwnershipToken(loan.collateralContract).safeTransferFrom(
            address(this),
            loan.lender,
            loan.collateralTokenId
        );

        // Update loan status
        loan.status = LoanStatus.Defaulted;

        // Emit event
        emit LoanLiquidated(loanId, msg.sender, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Returns all active loan request IDs
     * @return Array of active loan request IDs
     */
    function getActiveLoanRequests() external view returns (uint256[] memory) {
        return activeLoanRequestIds;
    }

    /**
     * @notice Returns paginated active loan request IDs
     * @param startIndex Starting index for pagination
     * @param count Maximum number of requests to return
     * @return Array of active loan request IDs (up to count items)
     */
    function getActiveLoanRequestsPaginated(
        uint256 startIndex,
        uint256 count
    ) external view returns (uint256[] memory) {
        uint256 totalRequests = activeLoanRequestIds.length;

        if (startIndex >= totalRequests) {
            return new uint256[](0);
        }

        uint256 endIndex = startIndex + count;
        if (endIndex > totalRequests) {
            endIndex = totalRequests;
        }

        uint256 resultLength = endIndex - startIndex;
        uint256[] memory result = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = activeLoanRequestIds[startIndex + i];
        }

        return result;
    }

    /**
     * @notice Returns the total count of active loan requests
     * @return Total number of active loan requests
     */
    function getActiveLoanRequestsCount() external view returns (uint256) {
        return activeLoanRequestIds.length;
    }

    /**
     * @notice Gets loan details by ID
     * @param loanId The loan ID to query
     * @return Loan struct containing all loan details
     */
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    /**
     * @notice Gets all loan IDs for a lender
     * @param lender The lender's address
     * @return Array of loan IDs where the address is the lender
     */
    function getLenderLoans(
        address lender
    ) external view returns (uint256[] memory) {
        return lenderLoans[lender];
    }

    /**
     * @notice Gets paginated loan IDs for a lender
     * @param lender The lender's address
     * @param startIndex Starting index for pagination
     * @param count Maximum number of loans to return
     * @return Array of loan IDs (up to count items)
     */
    function getLenderLoansPaginated(
        address lender,
        uint256 startIndex,
        uint256 count
    ) external view returns (uint256[] memory) {
        uint256[] storage allLoans = lenderLoans[lender];
        uint256 totalLoans = allLoans.length;

        if (startIndex >= totalLoans) {
            return new uint256[](0);
        }

        uint256 endIndex = startIndex + count;
        if (endIndex > totalLoans) {
            endIndex = totalLoans;
        }

        uint256 resultLength = endIndex - startIndex;
        uint256[] memory result = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allLoans[startIndex + i];
        }

        return result;
    }

    /**
     * @notice Gets all loan IDs for a borrower
     * @param borrower The borrower's address
     * @return Array of loan IDs where the address is the borrower
     */
    function getBorrowerLoans(
        address borrower
    ) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    /**
     * @notice Gets paginated loan IDs for a borrower
     * @param borrower The borrower's address
     * @param startIndex Starting index for pagination
     * @param count Maximum number of loans to return
     * @return Array of loan IDs (up to count items)
     */
    function getBorrowerLoansPaginated(
        address borrower,
        uint256 startIndex,
        uint256 count
    ) external view returns (uint256[] memory) {
        uint256[] storage allLoans = borrowerLoans[borrower];
        uint256 totalLoans = allLoans.length;

        if (startIndex >= totalLoans) {
            return new uint256[](0);
        }

        uint256 endIndex = startIndex + count;
        if (endIndex > totalLoans) {
            endIndex = totalLoans;
        }

        uint256 resultLength = endIndex - startIndex;
        uint256[] memory result = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allLoans[startIndex + i];
        }

        return result;
    }

    /**
     * @notice Returns the total count of loans for a lender
     * @param lender The lender's address
     * @return Total number of loans for the lender
     */
    function getLenderLoansCount(
        address lender
    ) external view returns (uint256) {
        return lenderLoans[lender].length;
    }

    /**
     * @notice Returns the total count of loans for a borrower
     * @param borrower The borrower's address
     * @return Total number of loans for the borrower
     */
    function getBorrowerLoansCount(
        address borrower
    ) external view returns (uint256) {
        return borrowerLoans[borrower].length;
    }

    /**
     * @notice Checks if a loan exists
     * @param loanId The loan ID to check
     * @return True if the loan exists, false otherwise
     */
    function loanExists(uint256 loanId) external view returns (bool) {
        return loans[loanId].id != 0;
    }

    /**
     * @notice Calculates the current interest for an active loan
     * @param loanId The loan ID to calculate interest for
     * @return The current interest amount
     */
    function calculateCurrentInterest(
        uint256 loanId
    ) external view returns (uint256) {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan is not active");

        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 annualizedAmount = (loan.amount * loan.interestRate) / 10000;
        return (annualizedAmount * timeElapsed) / 31557600;
    }

    /**
     * @notice Calculates the total repayment amount for an active loan
     * @param loanId The loan ID to calculate repayment for
     * @return The total repayment amount (principal + interest)
     */
    function calculateTotalRepayment(
        uint256 loanId
    ) external view returns (uint256) {
        uint256 interest = this.calculateCurrentInterest(loanId);
        return loans[loanId].amount + interest;
    }

    /**
     * @notice Checks if a loan has defaulted (past due date or undercollateralized)
     * @param loanId The loan ID to check
     * @return True if the loan has defaulted, false otherwise
     */
    function isLoanDefaulted(uint256 loanId) external view returns (bool) {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");

        if (loan.status != LoanStatus.Active) {
            return false;
        }

        bool timeDefaulted = block.timestamp > loan.startTime + loan.duration;
        bool priceDefaulted = false;

        // Check for price-based default only if oracle is available
        if (address(domainValuationOracle) != address(0)) {
            uint256 currentRatio = _getCollateralizationRatio(loanId);
            priceDefaulted = currentRatio < loan.liquidationThresholdBPS;
        }

        return timeDefaulted || priceDefaulted;
    }

    /**
     * @notice Gets detailed repayment information for an active loan
     * @param loanId The loan ID to query
     * @return totalOwed Total amount owed (principal + interest)
     * @return repaidAmount Amount already repaid
     * @return remainingAmount Amount still owed
     * @return interestAccrued Total interest accrued so far
     */
    function getLoanRepaymentInfo(
        uint256 loanId
    )
        external
        view
        returns (
            uint256 totalOwed,
            uint256 repaidAmount,
            uint256 remainingAmount,
            uint256 interestAccrued
        )
    {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan is not active");

        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 annualizedAmount = (loan.amount * loan.interestRate) / 10000;
        interestAccrued = (annualizedAmount * timeElapsed) / 31557600;
        totalOwed = loan.amount + interestAccrued;
        repaidAmount = loan.repaidAmount;
        remainingAmount = totalOwed - repaidAmount;
    }

    /**
     * @notice Gets the current health factor (collateralization ratio) of an active loan.
     * @param loanId The ID of the loan.
     * @return currentRatio The current collateralization ratio in basis points.
     */
    function getLoanHealthFactor(
        uint256 loanId
    ) external view returns (uint256 currentRatio) {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan is not active");

        return _getCollateralizationRatio(loanId);
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculates the current collateralization ratio for a given loan.
     * @param loanId The ID of the loan.
     * @return currentCollateralRatio The ratio in basis points (e.g., 15000 for 150%).
     */
    function _getCollateralizationRatio(
        uint256 loanId
    ) internal view returns (uint256 currentCollateralRatio) {
        Loan storage loan = loans[loanId];

        require(address(domainValuationOracle) != address(0), "Oracle not set");

        // Get domain value from oracle (returns USD value with 18 decimals)
        uint256 collateralValue = domainValuationOracle.getDomainValue(
            loan.collateralContract,
            loan.collateralTokenId
        );

        // For simplicity, assume borrowed token is stablecoin (USDC) = $1
        // In production, you may want to add a Chainlink oracle for the borrowed token
        uint8 loanTokenDecimals = IERC20Metadata(loan.tokenAddress).decimals();

        // Scale loan amount to 18 decimals for consistent calculations
        uint256 scaledLoanAmount;
        if (loanTokenDecimals < 18) {
            scaledLoanAmount = loan.amount * (10 ** (18 - loanTokenDecimals));
        } else if (loanTokenDecimals > 18) {
            scaledLoanAmount = loan.amount / (10 ** (loanTokenDecimals - 18));
        } else {
            scaledLoanAmount = loan.amount;
        }

        // Assume stablecoin = $1 (1e18 in 18 decimal format)
        uint256 loanValue = scaledLoanAmount; // Since price = 1

        // Avoid division by zero
        require(loanValue > 0, "Loan value cannot be zero");

        // Calculate ratio: (Collateral Value / Loan Value) * 10000 (for basis points)
        currentCollateralRatio = (collateralValue * 10000) / loanValue;
    }

    /**
     * @notice Removes a loan ID from the activeLoanRequestIds array in O(1) time
     * @param loanId The loan ID to remove
     */
    function _removeLoanFromActiveRequests(uint256 loanId) internal {
        uint256 length = activeLoanRequestIds.length;
        if (length == 0) return;

        // Get the index of the loan ID to remove
        uint256 indexToRemove = activeLoanRequestIndex[loanId];

        // Ensure the loan ID is actually in the array
        if (
            indexToRemove < length &&
            activeLoanRequestIds[indexToRemove] == loanId
        ) {
            // If not the last element, swap with last element
            if (indexToRemove != length - 1) {
                uint256 lastLoanId = activeLoanRequestIds[length - 1];
                activeLoanRequestIds[indexToRemove] = lastLoanId;
                // Update the index mapping for the moved element
                activeLoanRequestIndex[lastLoanId] = indexToRemove;
            }

            // Remove the last element
            activeLoanRequestIds.pop();

            // Clean up the mapping
            delete activeLoanRequestIndex[loanId];

            // Emit event
            emit LoanRequestRemoved(loanId, "Loan funded or cancelled");
        }
    }

    /**
     * @notice Handle the receipt of an NFT
     * @dev Required to receive ERC721 tokens via safeTransferFrom
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
