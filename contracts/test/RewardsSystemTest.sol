// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/DreamLend.sol";
import "../src/DreamerToken.sol";
import "../src/RewardsDistributor.sol";
import "../src/MockTokens.sol";

/**
 * @title RewardsSystemTest
 * @dev Comprehensive tests for the DreamLend liquidity mining rewards system
 */
contract RewardsSystemTest is Test {
    // ============ Contract Instances ============

    DreamLend public dreamLend;
    DreamerToken public dreamerToken;
    RewardsDistributor public rewardsDistributor;
    MockTokens public mockTokens;

    // ============ Test Configuration ============

    uint256 public constant INITIAL_REWARDS_PER_SECOND = 1e18; // 1 DREAM per second
    uint256 public constant REWARDS_POOL_AMOUNT = 1_000_000 * 1e18; // 1M DREAM tokens
    uint256 public constant LOAN_AMOUNT = 1000 * 1e6; // 1000 USDT (6 decimals)
    uint256 public constant COLLATERAL_AMOUNT = 2000 * 1e6; // 2000 USDT as collateral
    uint256 public constant INTEREST_RATE = 500; // 5% APR
    uint256 public constant LOAN_DURATION = 30 days;

    // ============ Test Actors ============

    address public owner;
    address public lender;
    address public borrower;
    address public liquidator;

    // ============ Setup ============

    function setUp() public {
        // Set up test actors
        owner = address(this);
        lender = makeAddr("lender");
        borrower = makeAddr("borrower");
        liquidator = makeAddr("liquidator");

        // Deploy contracts
        dreamLend = new DreamLend();
        dreamerToken = new DreamerToken();
        mockTokens = new MockTokens();

        // Deploy rewards distributor
        rewardsDistributor = new RewardsDistributor(
            address(dreamerToken),
            address(dreamLend),
            INITIAL_REWARDS_PER_SECOND
        );

        // Connect rewards distributor to DreamLend
        dreamLend.setRewardsDistributor(address(rewardsDistributor));

        // Transfer DREAM tokens to rewards distributor
        dreamerToken.transferToRewardsDistributor(
            address(rewardsDistributor),
            REWARDS_POOL_AMOUNT
        );

        // Setup mock tokens for testing
        _setupMockTokens();

        // Fund test actors with mock tokens
        _fundTestActors();
    }

    // ============ Core Functionality Tests ============

    function testRewardsDistributorDeployment() public {
        assertEq(
            address(rewardsDistributor.dreamToken()),
            address(dreamerToken)
        );
        assertEq(rewardsDistributor.dreamLendContract(), address(dreamLend));
        assertEq(
            rewardsDistributor.rewardsPerSecond(),
            INITIAL_REWARDS_PER_SECOND
        );
        assertEq(
            dreamerToken.balanceOf(address(rewardsDistributor)),
            REWARDS_POOL_AMOUNT
        );
    }

    function testDreamLendRewardsIntegration() public {
        assertEq(
            address(dreamLend.rewardsDistributor()),
            address(rewardsDistributor)
        );
    }

    function testLoanCreationAndAcceptanceWithRewards() public {
        uint256 loanId = _createAndAcceptLoan();

        // Verify loan is active
        DreamLend.Loan memory loan = dreamLend.getLoan(loanId);
        assertEq(uint256(loan.status), uint256(DreamLend.LoanStatus.Active));

        // Verify both lender and borrower have active principal
        assertEq(rewardsDistributor.userActivePrincipal(lender), LOAN_AMOUNT);
        assertEq(rewardsDistributor.userActivePrincipal(borrower), LOAN_AMOUNT);
        assertEq(rewardsDistributor.totalActivePrincipal(), LOAN_AMOUNT * 2);
    }

    function testRewardsAccrual() public {
        uint256 loanId = _createAndAcceptLoan();

        // Fast forward time to accrue rewards
        uint256 timeElapsed = 1 hours;
        vm.warp(block.timestamp + timeElapsed);

        // Calculate expected rewards (50% for lender, 50% for borrower)
        uint256 expectedRewardsPerUser = (INITIAL_REWARDS_PER_SECOND *
            timeElapsed) / 2;

        // Check pending rewards
        uint256 lenderRewards = rewardsDistributor.getPendingRewards(lender);
        uint256 borrowerRewards = rewardsDistributor.getPendingRewards(
            borrower
        );

        assertApproxEqRel(lenderRewards, expectedRewardsPerUser, 0.01e18); // 1% tolerance
        assertApproxEqRel(borrowerRewards, expectedRewardsPerUser, 0.01e18); // 1% tolerance
    }

    function testRewardsClaiming() public {
        uint256 loanId = _createAndAcceptLoan();

        // Fast forward time to accrue rewards
        uint256 timeElapsed = 1 hours;
        vm.warp(block.timestamp + timeElapsed);

        // Claim rewards as lender
        vm.startPrank(lender);
        uint256 lenderBalanceBefore = dreamerToken.balanceOf(lender);
        uint256 pendingRewards = rewardsDistributor.getPendingRewards(lender);

        rewardsDistributor.claimRewards();

        uint256 lenderBalanceAfter = dreamerToken.balanceOf(lender);
        assertEq(lenderBalanceAfter - lenderBalanceBefore, pendingRewards);
        assertEq(rewardsDistributor.getPendingRewards(lender), 0);
        vm.stopPrank();
    }

    function testRewardsStopOnLoanRepayment() public {
        uint256 loanId = _createAndAcceptLoan();

        // Fast forward some time
        vm.warp(block.timestamp + 1 hours);

        // Repay loan
        vm.startPrank(borrower);
        uint256 totalRepayment = dreamLend.calculateTotalRepayment(loanId);
        mockTokens.mint(
            borrower,
            address(mockTokens.usdt()),
            totalRepayment - LOAN_AMOUNT
        ); // Mint interest amount
        mockTokens.usdt().approve(address(dreamLend), totalRepayment);
        dreamLend.repayLoan(loanId);
        vm.stopPrank();

        // Verify rewards stopped
        assertEq(rewardsDistributor.userActivePrincipal(lender), 0);
        assertEq(rewardsDistributor.userActivePrincipal(borrower), 0);
        assertEq(rewardsDistributor.totalActivePrincipal(), 0);

        // Verify loan is repaid
        DreamLend.Loan memory loan = dreamLend.getLoan(loanId);
        assertEq(uint256(loan.status), uint256(DreamLend.LoanStatus.Repaid));
    }

    function testRewardsStopOnLoanLiquidation() public {
        uint256 loanId = _createAndAcceptLoan();

        // Fast forward time past loan duration to trigger liquidation
        vm.warp(block.timestamp + LOAN_DURATION + 1);

        // Liquidate loan
        vm.startPrank(liquidator);
        dreamLend.liquidateLoan(loanId);
        vm.stopPrank();

        // Verify rewards stopped
        assertEq(rewardsDistributor.userActivePrincipal(lender), 0);
        assertEq(rewardsDistributor.userActivePrincipal(borrower), 0);
        assertEq(rewardsDistributor.totalActivePrincipal(), 0);

        // Verify loan is defaulted
        DreamLend.Loan memory loan = dreamLend.getLoan(loanId);
        assertEq(uint256(loan.status), uint256(DreamLend.LoanStatus.Defaulted));
    }

    function testMultipleLoansRewardsDistribution() public {
        // Create first loan
        uint256 loanId1 = _createAndAcceptLoan();

        // Create second loan with different amount
        uint256 largerLoanAmount = 2000 * 1e6; // 2000 USDT
        uint256 loanId2 = _createLoanWithAmount(largerLoanAmount);

        // Accept second loan with different borrower
        address borrower2 = makeAddr("borrower2");
        vm.deal(borrower2, 1 ether);
        mockTokens.mint(
            borrower2,
            address(mockTokens.usdt()),
            COLLATERAL_AMOUNT * 2
        );

        vm.startPrank(borrower2);
        mockTokens.usdt().approve(address(dreamLend), COLLATERAL_AMOUNT * 2);
        dreamLend.acceptLoanOffer(loanId2);
        vm.stopPrank();

        // Fast forward time
        vm.warp(block.timestamp + 1 hours);

        // Check that rewards are distributed proportionally
        uint256 totalPrincipal = LOAN_AMOUNT + largerLoanAmount; // Both lenders
        uint256 totalRewards = INITIAL_REWARDS_PER_SECOND * 1 hours;

        uint256 lender1ExpectedRewards = (totalRewards * LOAN_AMOUNT) /
            (totalPrincipal * 2); // /2 because borrowers also get rewards
        uint256 lender1ActualRewards = rewardsDistributor.getPendingRewards(
            lender
        );

        assertApproxEqRel(
            lender1ActualRewards,
            lender1ExpectedRewards,
            0.05e18
        ); // 5% tolerance
    }

    function testRewardsAPRCalculation() public {
        _createAndAcceptLoan();

        uint256 currentAPR = rewardsDistributor.getCurrentRewardsAPR();

        // With 2000 USDT total active principal (1000 from lender + 1000 from borrower)
        // and 1 DREAM per second emission rate
        // Annual rewards = 1 * 31557600 = 31,557,600 DREAM
        // APR = (31,557,600 / 2000) * 10000 = 157,788,000 basis points
        // This is a very high APR for testing purposes

        assertGt(currentAPR, 0);
    }

    // ============ Owner Functions Tests ============

    function testSetRewardsPerSecond() public {
        uint256 newRate = 2e18; // 2 DREAM per second
        rewardsDistributor.setRewardsPerSecond(newRate);
        assertEq(rewardsDistributor.rewardsPerSecond(), newRate);
    }

    function testOnlyOwnerCanSetRewardsPerSecond() public {
        vm.startPrank(lender);
        vm.expectRevert();
        rewardsDistributor.setRewardsPerSecond(2e18);
        vm.stopPrank();
    }

    function testToggleRewardsPause() public {
        assertFalse(rewardsDistributor.rewardsPaused());

        rewardsDistributor.toggleRewardsPause();
        assertTrue(rewardsDistributor.rewardsPaused());

        rewardsDistributor.toggleRewardsPause();
        assertFalse(rewardsDistributor.rewardsPaused());
    }

    function testRewardsWhenPaused() public {
        rewardsDistributor.toggleRewardsPause();

        vm.startPrank(lender);
        mockTokens.usdt().approve(address(dreamLend), LOAN_AMOUNT);

        vm.expectRevert("Rewards distribution is paused");
        dreamLend.createLoanOffer(
            address(mockTokens.usdt()),
            LOAN_AMOUNT,
            INTEREST_RATE,
            LOAN_DURATION,
            address(mockTokens.usdt()),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();
    }

    // ============ Edge Cases and Error Handling ============

    function testRewardsWithoutDistributorSet() public {
        // Deploy new DreamLend without rewards distributor
        DreamLend newDreamLend = new DreamLend();

        // Should work without rewards (no revert)
        vm.startPrank(lender);
        mockTokens.usdt().approve(address(newDreamLend), LOAN_AMOUNT);
        newDreamLend.createLoanOffer(
            address(mockTokens.usdt()),
            LOAN_AMOUNT,
            INTEREST_RATE,
            LOAN_DURATION,
            address(mockTokens.usdt()),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();
    }

    function testClaimRewardsWithZeroBalance() public {
        vm.startPrank(lender);
        vm.expectRevert("No rewards to claim");
        rewardsDistributor.claimRewards();
        vm.stopPrank();
    }

    function testInsufficientDreamTokensInDistributor() public {
        // Transfer all DREAM tokens out of distributor
        vm.startPrank(address(rewardsDistributor));
        dreamerToken.transfer(
            owner,
            dreamerToken.balanceOf(address(rewardsDistributor))
        );
        vm.stopPrank();

        uint256 loanId = _createAndAcceptLoan();
        vm.warp(block.timestamp + 1 hours);

        vm.startPrank(lender);
        vm.expectRevert("Insufficient DREAM tokens in contract");
        rewardsDistributor.claimRewards();
        vm.stopPrank();
    }

    // ============ Helper Functions ============

    function _setupMockTokens() internal {
        // Mock tokens are already deployed in MockTokens contract
        // Just verify they exist
        assertTrue(address(mockTokens.usdt()) != address(0));
    }

    function _fundTestActors() internal {
        // Give ETH for gas
        vm.deal(lender, 10 ether);
        vm.deal(borrower, 10 ether);
        vm.deal(liquidator, 10 ether);

        // Mint mock USDT tokens
        mockTokens.mint(lender, address(mockTokens.usdt()), LOAN_AMOUNT * 10);
        mockTokens.mint(
            borrower,
            address(mockTokens.usdt()),
            COLLATERAL_AMOUNT
        );
    }

    function _createAndAcceptLoan() internal returns (uint256 loanId) {
        // Create loan offer
        vm.startPrank(lender);
        mockTokens.usdt().approve(address(dreamLend), LOAN_AMOUNT);
        dreamLend.createLoanOffer(
            address(mockTokens.usdt()),
            LOAN_AMOUNT,
            INTEREST_RATE,
            LOAN_DURATION,
            address(mockTokens.usdt()),
            COLLATERAL_AMOUNT
        );
        vm.stopPrank();

        // Get loan ID
        uint256[] memory loanOffers = dreamLend.getActiveLoanOffers();
        loanId = loanOffers[loanOffers.length - 1];

        // Accept loan offer
        vm.startPrank(borrower);
        mockTokens.usdt().approve(address(dreamLend), COLLATERAL_AMOUNT);
        dreamLend.acceptLoanOffer(loanId);
        vm.stopPrank();

        return loanId;
    }

    function _createLoanWithAmount(
        uint256 amount
    ) internal returns (uint256 loanId) {
        // Fund lender with more tokens
        mockTokens.mint(lender, address(mockTokens.usdt()), amount);

        // Create loan offer
        vm.startPrank(lender);
        mockTokens.usdt().approve(address(dreamLend), amount);
        dreamLend.createLoanOffer(
            address(mockTokens.usdt()),
            amount,
            INTEREST_RATE,
            LOAN_DURATION,
            address(mockTokens.usdt()),
            COLLATERAL_AMOUNT * 2
        );
        vm.stopPrank();

        // Get loan ID
        uint256[] memory loanOffers = dreamLend.getActiveLoanOffers();
        loanId = loanOffers[loanOffers.length - 1];

        return loanId;
    }
}
