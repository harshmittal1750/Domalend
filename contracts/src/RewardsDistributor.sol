// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RewardsDistributor
 * @dev Handles the distribution of DREAM tokens as liquidity mining rewards
 * @notice This contract manages rewards for both lenders and borrowers in the DreamLend protocol
 */
contract RewardsDistributor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice The DREAM token contract address
    IERC20 public immutable dreamToken;

    /// @notice The DreamLend contract address (only this contract can call reward functions)
    address public dreamLendContract;

    /// @notice Rewards emission rate per second (DREAM tokens per second)
    uint256 public rewardsPerSecond;

    /// @notice Mapping of user addresses to their accrued but unclaimed rewards
    mapping(address => uint256) public userRewards;

    /// @notice Mapping of user addresses to their total active principal amount
    mapping(address => uint256) public userActivePrincipal;

    /// @notice Total principal amount across all active loans in the protocol
    uint256 public totalActivePrincipal;

    /// @notice Mapping of user addresses to their last reward update timestamp
    mapping(address => uint256) public lastUpdateTime;

    /// @notice Global last update time for rewards calculation
    uint256 public globalLastUpdateTime;

    /// @notice Accumulated rewards per token stored (scaled by 1e18 for precision)
    uint256 public rewardPerTokenStored;

    /// @notice Mapping of user addresses to their reward per token paid
    mapping(address => uint256) public userRewardPerTokenPaid;

    /// @notice Total rewards distributed since contract deployment
    uint256 public totalRewardsDistributed;

    /// @notice Emergency pause flag for rewards distribution
    bool public rewardsPaused;

    // ============ Events ============

    event RewardsUpdated(
        address indexed user,
        uint256 rewards,
        uint256 timestamp
    );

    event RewardsClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event RewardsStarted(
        address indexed user,
        uint256 principalAmount,
        uint256 timestamp
    );

    event RewardsStopped(
        address indexed user,
        uint256 principalAmount,
        uint256 timestamp
    );

    event RewardsPerSecondUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );

    event DreamLendContractUpdated(
        address oldContract,
        address newContract,
        uint256 timestamp
    );

    event RewardsPauseToggled(bool paused, uint256 timestamp);

    event EmergencyWithdrawal(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    // ============ Modifiers ============

    /// @notice Restricts function access to only the DreamLend contract
    modifier onlyDreamLendContract() {
        require(
            msg.sender == dreamLendContract,
            "Only DreamLend contract can call this"
        );
        _;
    }

    /// @notice Updates rewards for a user before executing function
    modifier updateReward(address _user) {
        rewardPerTokenStored = rewardPerToken();
        globalLastUpdateTime = block.timestamp;

        if (_user != address(0)) {
            userRewards[_user] = earned(_user);
            userRewardPerTokenPaid[_user] = rewardPerTokenStored;
            lastUpdateTime[_user] = block.timestamp;
        }
        _;
    }

    /// @notice Ensures rewards are not paused
    modifier whenNotPaused() {
        require(!rewardsPaused, "Rewards distribution is paused");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the RewardsDistributor contract
     * @param _dreamToken The address of the DREAM token contract
     * @param _dreamLendContract The address of the DreamLend contract
     * @param _rewardsPerSecond Initial rewards emission rate per second
     */
    constructor(
        address _dreamToken,
        address _dreamLendContract,
        uint256 _rewardsPerSecond
    ) Ownable(msg.sender) {
        require(_dreamToken != address(0), "Invalid DREAM token address");
        require(
            _dreamLendContract != address(0),
            "Invalid DreamLend contract address"
        );
        require(
            _rewardsPerSecond > 0,
            "Rewards per second must be greater than 0"
        );

        dreamToken = IERC20(_dreamToken);
        dreamLendContract = _dreamLendContract;
        rewardsPerSecond = _rewardsPerSecond;
        globalLastUpdateTime = block.timestamp;

        emit RewardsPerSecondUpdated(0, _rewardsPerSecond, block.timestamp);
        emit DreamLendContractUpdated(
            address(0),
            _dreamLendContract,
            block.timestamp
        );
    }

    // ============ External Functions (DreamLend Contract Only) ============

    /**
     * @notice Start accruing rewards for a user when they enter an active loan
     * @dev Called by DreamLend contract when a loan becomes Active
     * @param _user The user address (lender or borrower)
     * @param _amount The principal amount of the loan
     */
    function startAccruingRewards(
        address _user,
        uint256 _amount
    ) external onlyDreamLendContract whenNotPaused updateReward(_user) {
        require(_user != address(0), "Invalid user address");
        require(_amount > 0, "Amount must be greater than 0");

        // Add the principal amount to user's active principal
        userActivePrincipal[_user] += _amount;
        totalActivePrincipal += _amount;

        emit RewardsStarted(_user, _amount, block.timestamp);
    }

    /**
     * @notice Stop accruing rewards for a user when their loan ends
     * @dev Called by DreamLend contract when a loan is Repaid or Defaulted
     * @param _user The user address (lender or borrower)
     * @param _amount The principal amount of the loan
     */
    function stopAccruingRewards(
        address _user,
        uint256 _amount
    ) external onlyDreamLendContract whenNotPaused updateReward(_user) {
        require(_user != address(0), "Invalid user address");
        require(_amount > 0, "Amount must be greater than 0");
        require(
            userActivePrincipal[_user] >= _amount,
            "Insufficient active principal"
        );
        require(
            totalActivePrincipal >= _amount,
            "Insufficient total active principal"
        );

        // Subtract the principal amount from user's active principal
        userActivePrincipal[_user] -= _amount;
        totalActivePrincipal -= _amount;

        emit RewardsStopped(_user, _amount, block.timestamp);
    }

    // ============ External Functions (Public) ============

    /**
     * @notice Claim all accrued rewards for the caller
     * @dev Transfers DREAM tokens from this contract to the user
     */
    function claimRewards()
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        uint256 reward = userRewards[msg.sender];
        require(reward > 0, "No rewards to claim");

        // Check if contract has enough DREAM tokens
        uint256 contractBalance = dreamToken.balanceOf(address(this));
        require(
            contractBalance >= reward,
            "Insufficient DREAM tokens in contract"
        );

        // Reset user's rewards to 0
        userRewards[msg.sender] = 0;

        // Update total distributed rewards
        totalRewardsDistributed += reward;

        // Transfer DREAM tokens to user
        dreamToken.safeTransfer(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Calculate the reward per token stored value
     * @return The current reward per token (scaled by 1e18)
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalActivePrincipal == 0) {
            return rewardPerTokenStored;
        }

        uint256 timeElapsed = block.timestamp - globalLastUpdateTime;
        return
            rewardPerTokenStored +
            (timeElapsed * rewardsPerSecond * 1e18) /
            totalActivePrincipal;
    }

    /**
     * @notice Calculate the total earned rewards for a user
     * @param _user The user address to check
     * @return The total earned rewards (claimed + unclaimed)
     */
    function earned(address _user) public view returns (uint256) {
        return
            (userActivePrincipal[_user] *
                (rewardPerToken() - userRewardPerTokenPaid[_user])) /
            1e18 +
            userRewards[_user];
    }

    /**
     * @notice Get the pending (unclaimed) rewards for a user
     * @param _user The user address to check
     * @return The pending rewards amount
     */
    function getPendingRewards(address _user) external view returns (uint256) {
        return earned(_user);
    }

    /**
     * @notice Get the current APR for rewards based on total active principal
     * @return The rewards APR in basis points (e.g., 500 = 5%)
     */
    function getCurrentRewardsAPR() external view returns (uint256) {
        if (totalActivePrincipal == 0) {
            return 0;
        }

        // Calculate annual rewards: rewardsPerSecond * seconds per year
        uint256 annualRewards = rewardsPerSecond * 31557600; // 365.25 * 24 * 60 * 60

        // Calculate APR: (annual rewards / total principal) * 10000 (for basis points)
        return (annualRewards * 10000) / totalActivePrincipal;
    }

    /**
     * @notice Get comprehensive user reward information
     * @param _user The user address to check
     * @return activePrincipal The user's active principal amount
     * @return pendingRewards The user's pending (unclaimed) rewards
     * @return lastUpdate The timestamp of the user's last reward update
     */
    function getUserRewardInfo(
        address _user
    )
        external
        view
        returns (
            uint256 activePrincipal,
            uint256 pendingRewards,
            uint256 lastUpdate
        )
    {
        activePrincipal = userActivePrincipal[_user];
        pendingRewards = earned(_user);
        lastUpdate = lastUpdateTime[_user];
    }

    /**
     * @notice Get global reward statistics
     * @return totalPrincipal Total active principal across all users
     * @return currentAPR Current rewards APR in basis points
     * @return totalDistributed Total rewards distributed so far
     * @return contractBalance Current DREAM token balance of this contract
     */
    function getGlobalRewardStats()
        external
        view
        returns (
            uint256 totalPrincipal,
            uint256 currentAPR,
            uint256 totalDistributed,
            uint256 contractBalance
        )
    {
        totalPrincipal = totalActivePrincipal;
        currentAPR = this.getCurrentRewardsAPR();
        totalDistributed = totalRewardsDistributed;
        contractBalance = dreamToken.balanceOf(address(this));
    }

    // ============ Owner Functions ============

    /**
     * @notice Update the DreamLend contract address
     * @dev Only callable by the contract owner
     * @param _newDreamLendContract The new DreamLend contract address
     */
    function setDreamLendContract(
        address _newDreamLendContract
    ) external onlyOwner {
        require(
            _newDreamLendContract != address(0),
            "Invalid contract address"
        );
        address oldContract = dreamLendContract;
        dreamLendContract = _newDreamLendContract;

        emit DreamLendContractUpdated(
            oldContract,
            _newDreamLendContract,
            block.timestamp
        );
    }

    /**
     * @notice Update the rewards emission rate
     * @dev Only callable by the contract owner
     * @param _newRewardsPerSecond The new rewards per second rate
     */
    function setRewardsPerSecond(
        uint256 _newRewardsPerSecond
    ) external onlyOwner updateReward(address(0)) {
        require(
            _newRewardsPerSecond > 0,
            "Rewards per second must be greater than 0"
        );

        uint256 oldRate = rewardsPerSecond;
        rewardsPerSecond = _newRewardsPerSecond;

        emit RewardsPerSecondUpdated(
            oldRate,
            _newRewardsPerSecond,
            block.timestamp
        );
    }

    /**
     * @notice Toggle the emergency pause for rewards distribution
     * @dev Only callable by the contract owner
     */
    function toggleRewardsPause() external onlyOwner {
        rewardsPaused = !rewardsPaused;

        emit RewardsPauseToggled(rewardsPaused, block.timestamp);
    }

    /**
     * @notice Emergency function to withdraw tokens from the contract
     * @dev Only callable by the contract owner
     * @param _tokenAddress The token address to withdraw (address(0) for ETH)
     * @param _amount The amount to withdraw
     * @param _recipient The address to send tokens to
     */
    function emergencyWithdraw(
        address _tokenAddress,
        uint256 _amount,
        address _recipient
    ) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than 0");

        if (_tokenAddress == address(0)) {
            // Withdraw ETH
            require(
                address(this).balance >= _amount,
                "Insufficient ETH balance"
            );
            payable(_recipient).transfer(_amount);
        } else {
            // Withdraw ERC20 tokens
            IERC20 token = IERC20(_tokenAddress);
            require(
                token.balanceOf(address(this)) >= _amount,
                "Insufficient token balance"
            );
            token.safeTransfer(_recipient, _amount);
        }

        emit EmergencyWithdrawal(
            _tokenAddress,
            _recipient,
            _amount,
            block.timestamp
        );
    }

    // ============ Fallback Functions ============

    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {}

    /**
     * @notice Fallback function for any other calls
     */
    fallback() external payable {}
}
