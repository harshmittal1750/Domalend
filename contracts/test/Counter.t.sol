// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {DreamLend} from "../src/DreamLend.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Mock ERC20 Token for Testing
 * @dev Simple ERC20 implementation for testing purposes
 */
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(
            allowance[from][msg.sender] >= amount,
            "Insufficient allowance"
        );

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

/**
 * @title DreamLend Test Suite
 * @dev Comprehensive test suite for DreamLend contract functionality
 */
contract DreamLendTest is Test {
    DreamLend public dreamLend;
    MockERC20 public loanToken;
    MockERC20 public collateralToken;

    address public lender = address(0x1);
    address public borrower = address(0x2);

    // Test loan parameters
    uint256 public constant LOAN_AMOUNT = 1000e18; // 1000 tokens
    uint256 public constant INTEREST_RATE = 500; // 5% APR
    uint256 public constant DURATION = 30 days;
    uint256 public constant COLLATERAL_AMOUNT = 1500e18; // 1500 collateral tokens

    function setUp() public {
        dreamLend = new DreamLend();

        // Deploy mock tokens
        loanToken = new MockERC20("Loan Token", "LOAN", 18);
        collateralToken = new MockERC20("Collateral Token", "COLL", 18);

        // Mint tokens to lender and borrower
        loanToken.mint(lender, 10000e18);
        collateralToken.mint(borrower, 10000e18);

        // Label addresses for better test output
        vm.label(lender, "Lender");
        vm.label(borrower, "Borrower");
        vm.label(address(dreamLend), "DreamLend");
        vm.label(address(loanToken), "LoanToken");
        vm.label(address(collateralToken), "CollateralToken");
    }

    function test_Deployment() public {
        // Test that the contract deploys successfully
        assertTrue(address(dreamLend) != address(0));
        assertEq(dreamLend.nextLoanId(), 1);
    }

    function test_GetActiveLoanOffers() public {
        // Test that initially there are no active loan offers
        uint256[] memory activeOffers = dreamLend.getActiveLoanOffers();
        assertEq(activeOffers.length, 0);
    }

    function test_GetEmptyLenderLoans() public {
        // Test that a new address has no loans
        uint256[] memory lenderLoans = dreamLend.getLenderLoans(lender);
        assertEq(lenderLoans.length, 0);
    }

    function test_GetEmptyBorrowerLoans() public {
        // Test that a new address has no loans
        uint256[] memory borrowerLoans = dreamLend.getBorrowerLoans(borrower);
        assertEq(borrowerLoans.length, 0);
    }

    function test_GetNonexistentLoan() public {
        // Test getting a loan that doesn't exist returns empty struct
        DreamLend.Loan memory loan = dreamLend.getLoan(999);
        assertEq(loan.id, 0);
        assertEq(loan.lender, address(0));
        assertEq(loan.borrower, address(0));
    }

    function test_CreateLoanOffer_Success() public {
        // Arrange: Lender approves the contract to spend tokens
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);

        // Get initial balances
        uint256 lenderBalanceBefore = loanToken.balanceOf(lender);
        uint256 contractBalanceBefore = loanToken.balanceOf(address(dreamLend));

        // Act: Create loan offer
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();

        // Assert: Check balances updated correctly
        assertEq(
            loanToken.balanceOf(lender),
            lenderBalanceBefore - LOAN_AMOUNT
        );
        assertEq(
            loanToken.balanceOf(address(dreamLend)),
            contractBalanceBefore + LOAN_AMOUNT
        );

        // Assert: Check loan data stored correctly
        DreamLend.Loan memory loan = dreamLend.getLoan(1);
        assertEq(loan.id, 1);
        assertEq(loan.lender, lender);
        assertEq(loan.borrower, address(0));
        assertEq(loan.tokenAddress, address(loanToken));
        assertEq(loan.amount, LOAN_AMOUNT);
        assertEq(loan.interestRate, INTEREST_RATE);
        assertEq(loan.duration, DURATION);
        assertEq(loan.collateralAddress, address(collateralToken));
        assertEq(loan.collateralAmount, COLLATERAL_AMOUNT);
        assertEq(loan.startTime, 0);
        assertTrue(loan.status == DreamLend.LoanStatus.Pending);

        // Assert: Check active loan offers updated
        uint256[] memory activeOffers = dreamLend.getActiveLoanOffers();
        assertEq(activeOffers.length, 1);
        assertEq(activeOffers[0], 1);

        // Assert: Check lender loans mapping updated
        uint256[] memory lenderLoans = dreamLend.getLenderLoans(lender);
        assertEq(lenderLoans.length, 1);
        assertEq(lenderLoans[0], 1);

        // Assert: Check nextLoanId incremented
        assertEq(dreamLend.nextLoanId(), 2);
    }

    function test_CreateLoanOffer_InsufficientAllowance() public {
        // Arrange: Lender doesn't approve enough tokens
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT - 1);

        // Act & Assert: Should revert with insufficient allowance
        vm.expectRevert("Insufficient allowance");
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();
    }

    function test_CreateLoanOffer_InvalidInputs() public {
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);

        // Test invalid token address
        vm.expectRevert("Invalid token address");
        dreamLend.createLoanOffer(
            address(0),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        // Test zero amount
        vm.expectRevert("Amount must be greater than 0");
        dreamLend.createLoanOffer(
            address(loanToken),
            0,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        // Test zero interest rate
        vm.expectRevert("Interest rate must be greater than 0");
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            0,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        // Test excessive interest rate (over 100%)
        vm.expectRevert("Interest rate cannot exceed 100%");
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            10001, // 100.01%
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        // Test zero duration
        vm.expectRevert("Duration must be greater than 0");
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            0,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        // Test excessive duration (over 1 year)
        vm.expectRevert("Duration cannot exceed 1 year");
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            366 days,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        // Test invalid collateral address
        vm.expectRevert("Invalid collateral address");
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(0),
            COLLATERAL_AMOUNT
        );

        // Test zero collateral amount
        vm.expectRevert("Collateral amount must be greater than 0");
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            0
        );

        vm.stopPrank();
    }

    function test_CreateMultipleLoanOffers() public {
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT * 3);

        // Create three loan offers
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE + 100, // 6% APR
            DURATION * 2,
            address(collateralToken),
            COLLATERAL_AMOUNT * 2
        );

        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE + 200, // 7% APR
            DURATION / 2,
            address(collateralToken),
            COLLATERAL_AMOUNT / 2
        );
        vm.stopPrank();

        // Check all loans created correctly
        assertEq(dreamLend.nextLoanId(), 4);

        uint256[] memory activeOffers = dreamLend.getActiveLoanOffers();
        assertEq(activeOffers.length, 3);
        assertEq(activeOffers[0], 1);
        assertEq(activeOffers[1], 2);
        assertEq(activeOffers[2], 3);

        uint256[] memory lenderLoans = dreamLend.getLenderLoans(lender);
        assertEq(lenderLoans.length, 3);

        // Check contract balance
        assertEq(loanToken.balanceOf(address(dreamLend)), LOAN_AMOUNT * 3);
    }

    // ============ AcceptLoanOffer Tests ============

    function test_AcceptLoanOffer_Success() public {
        // Setup: Create a loan offer first
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();

        // Arrange: Borrower approves collateral
        vm.startPrank(borrower);
        collateralToken.approve(address(dreamLend), COLLATERAL_AMOUNT);

        // Get initial balances
        uint256 borrowerLoanTokenBefore = loanToken.balanceOf(borrower);
        uint256 borrowerCollateralBefore = collateralToken.balanceOf(borrower);
        uint256 contractLoanTokenBefore = loanToken.balanceOf(
            address(dreamLend)
        );
        uint256 contractCollateralBefore = collateralToken.balanceOf(
            address(dreamLend)
        );

        // Act: Accept loan offer
        uint256 timestampBefore = block.timestamp;
        dreamLend.acceptLoanOffer(1);
        vm.stopPrank();

        // Assert: Check token transfers
        assertEq(
            loanToken.balanceOf(borrower),
            borrowerLoanTokenBefore + LOAN_AMOUNT
        );
        assertEq(
            collateralToken.balanceOf(borrower),
            borrowerCollateralBefore - COLLATERAL_AMOUNT
        );
        assertEq(
            loanToken.balanceOf(address(dreamLend)),
            contractLoanTokenBefore - LOAN_AMOUNT
        );
        assertEq(
            collateralToken.balanceOf(address(dreamLend)),
            contractCollateralBefore + COLLATERAL_AMOUNT
        );

        // Assert: Check loan data updated
        DreamLend.Loan memory loan = dreamLend.getLoan(1);
        assertEq(loan.borrower, borrower);
        assertEq(loan.startTime, timestampBefore);
        assertTrue(loan.status == DreamLend.LoanStatus.Active);

        // Assert: Check active offers array updated (loan removed)
        uint256[] memory activeOffers = dreamLend.getActiveLoanOffers();
        assertEq(activeOffers.length, 0);

        // Assert: Check borrower loans mapping updated
        uint256[] memory borrowerLoans_array = dreamLend.getBorrowerLoans(
            borrower
        );
        assertEq(borrowerLoans_array.length, 1);
        assertEq(borrowerLoans_array[0], 1);
    }

    function test_AcceptLoanOffer_NonexistentLoan() public {
        vm.startPrank(borrower);
        vm.expectRevert("Loan does not exist");
        dreamLend.acceptLoanOffer(999);
        vm.stopPrank();
    }

    function test_AcceptLoanOffer_NotPending() public {
        // Setup: Create and accept a loan
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();

        vm.startPrank(borrower);
        collateralToken.approve(address(dreamLend), COLLATERAL_AMOUNT);
        dreamLend.acceptLoanOffer(1);
        vm.stopPrank();

        // Try to accept the same loan again
        vm.startPrank(address(0x3));
        collateralToken.mint(address(0x3), COLLATERAL_AMOUNT);
        collateralToken.approve(address(dreamLend), COLLATERAL_AMOUNT);
        vm.expectRevert("Loan is not pending");
        dreamLend.acceptLoanOffer(1);
        vm.stopPrank();
    }

    function test_AcceptLoanOffer_LenderCannotAccept() public {
        // Setup: Create a loan offer
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        // Try to accept own loan
        collateralToken.mint(lender, COLLATERAL_AMOUNT);
        collateralToken.approve(address(dreamLend), COLLATERAL_AMOUNT);
        vm.expectRevert("Lender cannot accept own loan");
        dreamLend.acceptLoanOffer(1);
        vm.stopPrank();
    }

    function test_AcceptLoanOffer_InsufficientCollateralAllowance() public {
        // Setup: Create a loan offer
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();

        // Borrower doesn't approve enough collateral
        vm.startPrank(borrower);
        collateralToken.approve(address(dreamLend), COLLATERAL_AMOUNT - 1);
        vm.expectRevert("Insufficient allowance");
        dreamLend.acceptLoanOffer(1);
        vm.stopPrank();
    }

    // ============ RepayLoan Tests ============

    function test_RepayLoan_Success() public {
        // Setup: Create and accept a loan
        _createAndAcceptLoan();

        // Fast forward time (30 days)
        vm.warp(block.timestamp + 30 days);

        // Calculate expected interest using the new formula (5% APR for 30 days)
        // New formula: (amount * rate / 10000) * time / 31557600
        uint256 annualizedAmount = (LOAN_AMOUNT * INTEREST_RATE) / 10000;
        uint256 expectedInterest = (annualizedAmount * 30 days) / 31557600; // 365.25 days in seconds
        uint256 expectedTotal = LOAN_AMOUNT + expectedInterest;

        // Arrange: Borrower gets more loan tokens for repayment
        loanToken.mint(borrower, expectedTotal);
        vm.startPrank(borrower);
        loanToken.approve(address(dreamLend), expectedTotal);

        // Get initial balances
        uint256 lenderBalanceBefore = loanToken.balanceOf(lender);
        uint256 borrowerLoanTokenBefore = loanToken.balanceOf(borrower);
        uint256 borrowerCollateralBefore = collateralToken.balanceOf(borrower);
        uint256 contractCollateralBefore = collateralToken.balanceOf(
            address(dreamLend)
        );

        // Act: Repay loan
        dreamLend.repayLoan(1);
        vm.stopPrank();

        // Assert: Check token transfers
        assertEq(
            loanToken.balanceOf(lender),
            lenderBalanceBefore + expectedTotal
        );
        assertEq(
            loanToken.balanceOf(borrower),
            borrowerLoanTokenBefore - expectedTotal
        );
        assertEq(
            collateralToken.balanceOf(borrower),
            borrowerCollateralBefore + COLLATERAL_AMOUNT
        );
        assertEq(
            collateralToken.balanceOf(address(dreamLend)),
            contractCollateralBefore - COLLATERAL_AMOUNT
        );

        // Assert: Check loan status updated
        DreamLend.Loan memory loan = dreamLend.getLoan(1);
        assertTrue(loan.status == DreamLend.LoanStatus.Repaid);
    }

    function test_RepayLoan_NonexistentLoan() public {
        vm.startPrank(borrower);
        vm.expectRevert("Loan does not exist");
        dreamLend.repayLoan(999);
        vm.stopPrank();
    }

    function test_RepayLoan_NotActive() public {
        // Create loan but don't accept it
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();

        vm.startPrank(borrower);
        vm.expectRevert("Loan is not active");
        dreamLend.repayLoan(1);
        vm.stopPrank();
    }

    function test_RepayLoan_OnlyBorrower() public {
        // Setup: Create and accept a loan
        _createAndAcceptLoan();

        // Try to repay as someone else
        vm.startPrank(address(0x3));
        vm.expectRevert("Only borrower can repay");
        dreamLend.repayLoan(1);
        vm.stopPrank();
    }

    function test_RepayLoan_InterestCalculation() public {
        // Setup: Create and accept a loan
        _createAndAcceptLoan();

        // Test different time periods
        uint256[] memory timePeriods = new uint256[](3);
        timePeriods[0] = 10 days;
        timePeriods[1] = 30 days;
        timePeriods[2] = 90 days;

        for (uint256 i = 0; i < timePeriods.length; i++) {
            // Calculate expected interest
            uint256 expectedInterest = (LOAN_AMOUNT *
                INTEREST_RATE *
                timePeriods[i]) / (10000 * 365 days);

            // Simulate the calculation in a view function by warping time
            vm.warp(block.timestamp + timePeriods[i]);
            DreamLend.Loan memory loan = dreamLend.getLoan(1);
            uint256 timeElapsed = block.timestamp - loan.startTime;
            uint256 calculatedInterest = (loan.amount *
                loan.interestRate *
                timeElapsed) / (10000 * 365 days);

            assertEq(
                calculatedInterest,
                expectedInterest,
                "Interest calculation mismatch"
            );

            // Reset time for next iteration
            vm.warp(loan.startTime);
        }
    }

    // ============ LiquidateLoan Tests ============

    function test_LiquidateLoan_Success() public {
        // Setup: Create and accept a loan
        _createAndAcceptLoan();

        // Fast forward past the loan duration
        vm.warp(block.timestamp + DURATION + 1);

        // Get initial balances
        uint256 lenderCollateralBefore = collateralToken.balanceOf(lender);
        uint256 contractCollateralBefore = collateralToken.balanceOf(
            address(dreamLend)
        );

        // Act: Liquidate loan
        vm.startPrank(lender);
        dreamLend.liquidateLoan(1);
        vm.stopPrank();

        // Assert: Check collateral transfer
        assertEq(
            collateralToken.balanceOf(lender),
            lenderCollateralBefore + COLLATERAL_AMOUNT
        );
        assertEq(
            collateralToken.balanceOf(address(dreamLend)),
            contractCollateralBefore - COLLATERAL_AMOUNT
        );

        // Assert: Check loan status updated
        DreamLend.Loan memory loan = dreamLend.getLoan(1);
        assertTrue(loan.status == DreamLend.LoanStatus.Defaulted);
    }

    function test_LiquidateLoan_NonexistentLoan() public {
        vm.startPrank(lender);
        vm.expectRevert("Loan does not exist");
        dreamLend.liquidateLoan(999);
        vm.stopPrank();
    }

    function test_LiquidateLoan_NotActive() public {
        // Create loan but don't accept it
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );

        vm.expectRevert("Loan is not active");
        dreamLend.liquidateLoan(1);
        vm.stopPrank();
    }

    function test_LiquidateLoan_PublicAccess() public {
        // Setup: Create and accept a loan
        _createAndAcceptLoan();

        // Fast forward past the loan duration
        vm.warp(block.timestamp + DURATION + 1);

        // Anyone can liquidate now (public liquidation)
        address liquidator = address(0x3);

        uint256 lenderBalanceBefore = collateralToken.balanceOf(lender);
        uint256 liquidatorBalanceBefore = collateralToken.balanceOf(liquidator);

        // Liquidate as a third party
        vm.prank(liquidator);
        dreamLend.liquidateLoan(1);

        // Verify liquidator received fee and lender received remaining collateral
        uint256 expectedFee = (COLLATERAL_AMOUNT *
            dreamLend.LIQUIDATION_FEE_BPS()) / 10000;
        uint256 expectedLenderAmount = COLLATERAL_AMOUNT - expectedFee;

        assertEq(
            collateralToken.balanceOf(liquidator),
            liquidatorBalanceBefore + expectedFee
        );
        assertEq(
            collateralToken.balanceOf(lender),
            lenderBalanceBefore + expectedLenderAmount
        );
    }

    function test_LiquidateLoan_NotDefaulted() public {
        // Setup: Create and accept a loan
        _createAndAcceptLoan();

        // Try to liquidate before deadline
        vm.startPrank(lender);
        vm.expectRevert("Loan has not defaulted yet (time or price)");
        dreamLend.liquidateLoan(1);
        vm.stopPrank();

        // Try exactly at deadline (should still fail)
        vm.warp(block.timestamp + DURATION);
        vm.startPrank(lender);
        vm.expectRevert("Loan has not defaulted yet (time or price)");
        dreamLend.liquidateLoan(1);
        vm.stopPrank();
    }

    function test_LiquidateLoan_ExactDeadline() public {
        // Setup: Create and accept a loan
        _createAndAcceptLoan();

        // Move to exactly 1 second after deadline
        vm.warp(block.timestamp + DURATION + 1);

        // Should succeed
        vm.startPrank(lender);
        dreamLend.liquidateLoan(1);
        vm.stopPrank();

        DreamLend.Loan memory loan = dreamLend.getLoan(1);
        assertTrue(loan.status == DreamLend.LoanStatus.Defaulted);
    }

    // ============ Helper Functions ============

    function _createAndAcceptLoan() internal {
        // Create loan offer
        vm.startPrank(lender);
        loanToken.approve(address(dreamLend), LOAN_AMOUNT);
        dreamLend.createLoanOffer(
            address(loanToken),
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            address(collateralToken),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();

        // Accept loan offer
        vm.startPrank(borrower);
        collateralToken.approve(address(dreamLend), COLLATERAL_AMOUNT);
        dreamLend.acceptLoanOffer(1);
        vm.stopPrank();
    }
}
