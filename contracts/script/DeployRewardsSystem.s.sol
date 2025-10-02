// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DreamerToken} from "../src/DreamerToken.sol";
import {RewardsDistributor} from "../src/RewardsDistributor.sol";
import {DreamLend} from "../src/DreamLend.sol";

/**
 * @title DreamLend Rewards System Deployment Script
 * @dev Deploys the complete liquidity mining rewards system for DreamLend
 * @notice Run with: forge script script/DeployRewardsSystem.s.sol --rpc-url <SOMNIA_L1_TESTNET_RPC> --private-key <PRIVATE_KEY> --broadcast
 */
contract DeployRewardsSystemScript is Script {
    // ============ Contract Instances ============

    DreamerToken public dreamerToken;
    RewardsDistributor public rewardsDistributor;
    DreamLend public dreamLend;

    // ============ Configuration ============

    /// @notice Initial rewards emission rate: 1 DREAM per second
    uint256 public constant INITIAL_REWARDS_PER_SECOND = 1e18;

    /// @notice Amount of DREAM tokens to transfer to rewards distributor (10M tokens)
    uint256 public constant REWARDS_POOL_AMOUNT = 10_000_000 * 1e18;

    /// @notice Existing DreamLend contract address (set this to your deployed contract)
    /// @dev Update this address to your deployed DreamLend contract or set to address(0) to deploy new
    address public constant EXISTING_DREAMLEND_ADDRESS = address(0);

    // ============ Setup ============

    function setUp() public {}

    // ============ Main Deployment Function ============

    function run() public {
        // Start broadcasting transactions
        vm.startBroadcast();

        console.log("=== DreamLend Rewards System Deployment ===");
        console.log("Deployer address:", msg.sender);
        console.log("Chain ID:", block.chainid);
        console.log("");

        // Step 1: Deploy or use existing DreamLend contract
        if (EXISTING_DREAMLEND_ADDRESS == address(0)) {
            console.log("1. Deploying new DreamLend contract...");
            dreamLend = new DreamLend();
            console.log("   DreamLend deployed at:", address(dreamLend));
        } else {
            console.log("1. Using existing DreamLend contract...");
            dreamLend = DreamLend(EXISTING_DREAMLEND_ADDRESS);
            console.log("   DreamLend address:", address(dreamLend));
        }
        console.log("");

        // Step 2: Deploy DreamerToken
        console.log("2. Deploying DreamerToken ($DREAM)...");
        dreamerToken = new DreamerToken();
        console.log("   DreamerToken deployed at:", address(dreamerToken));
        console.log(
            "   Total supply:",
            dreamerToken.getTotalSupply() / 1e18,
            "DREAM"
        );
        console.log(
            "   Deployer balance:",
            dreamerToken.balanceOf(msg.sender) / 1e18,
            "DREAM"
        );
        console.log("");

        // Step 3: Deploy RewardsDistributor
        console.log("3. Deploying RewardsDistributor...");
        rewardsDistributor = new RewardsDistributor(
            address(dreamerToken),
            address(dreamLend),
            INITIAL_REWARDS_PER_SECOND
        );
        console.log(
            "   RewardsDistributor deployed at:",
            address(rewardsDistributor)
        );
        console.log(
            "   Initial rewards per second:",
            INITIAL_REWARDS_PER_SECOND / 1e18,
            "DREAM/sec"
        );
        console.log("");

        // Step 4: Transfer DREAM tokens to RewardsDistributor
        console.log("4. Transferring DREAM tokens to RewardsDistributor...");
        dreamerToken.transferToRewardsDistributor(
            address(rewardsDistributor),
            REWARDS_POOL_AMOUNT
        );
        console.log(
            "   Transferred:",
            REWARDS_POOL_AMOUNT / 1e18,
            "DREAM tokens"
        );
        console.log(
            "   RewardsDistributor balance:",
            dreamerToken.balanceOf(address(rewardsDistributor)) / 1e18,
            "DREAM"
        );
        console.log("");

        // Step 5: Set RewardsDistributor in DreamLend contract
        console.log("5. Connecting RewardsDistributor to DreamLend...");
        dreamLend.setRewardsDistributor(address(rewardsDistributor));
        console.log("   RewardsDistributor set successfully");
        console.log("");

        // Step 6: Verify deployment
        console.log("6. Verifying deployment...");
        _verifyDeployment();
        console.log("");

        // Step 7: Display summary
        _displaySummary();

        // Stop broadcasting transactions
        vm.stopBroadcast();
    }

    // ============ Verification Functions ============

    /**
     * @notice Verify that all contracts are deployed and configured correctly
     */
    function _verifyDeployment() internal view {
        // Verify DreamerToken
        require(
            address(dreamerToken) != address(0),
            "DreamerToken not deployed"
        );
        require(
            dreamerToken.totalSupply() == dreamerToken.getTotalSupply(),
            "DreamerToken supply mismatch"
        );

        // Verify RewardsDistributor
        require(
            address(rewardsDistributor) != address(0),
            "RewardsDistributor not deployed"
        );
        require(
            address(rewardsDistributor.dreamToken()) == address(dreamerToken),
            "RewardsDistributor DREAM token mismatch"
        );
        require(
            rewardsDistributor.dreamLendContract() == address(dreamLend),
            "RewardsDistributor DreamLend mismatch"
        );
        require(
            rewardsDistributor.rewardsPerSecond() == INITIAL_REWARDS_PER_SECOND,
            "RewardsDistributor emission rate mismatch"
        );

        // Verify DreamLend
        require(address(dreamLend) != address(0), "DreamLend not deployed");
        require(
            address(dreamLend.rewardsDistributor()) ==
                address(rewardsDistributor),
            "DreamLend rewards distributor mismatch"
        );

        // Verify token balances
        require(
            dreamerToken.balanceOf(address(rewardsDistributor)) >=
                REWARDS_POOL_AMOUNT,
            "Insufficient DREAM tokens in distributor"
        );

        console.log("All contracts deployed and configured correctly");
    }

    /**
     * @notice Display deployment summary
     */
    function _displaySummary() internal view {
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("");
        console.log("Contract Addresses:");
        console.log("  DreamLend:         ", address(dreamLend));
        console.log("  DreamerToken:      ", address(dreamerToken));
        console.log("  RewardsDistributor:", address(rewardsDistributor));
        console.log("");
        console.log("Token Information:");
        console.log(
            "  DREAM Total Supply:",
            dreamerToken.getTotalSupply() / 1e18,
            "tokens"
        );
        console.log(
            "  Rewards Pool:      ",
            REWARDS_POOL_AMOUNT / 1e18,
            "tokens"
        );
        console.log(
            "  Emission Rate:     ",
            INITIAL_REWARDS_PER_SECOND / 1e18,
            "DREAM/sec"
        );
        console.log("");
        console.log("Configuration:");
        console.log("  Chain ID:          ", block.chainid);
        console.log("  Deployer:          ", msg.sender);
        console.log("  Block Number:      ", block.number);
        console.log("  Timestamp:         ", block.timestamp);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update frontend contract addresses");
        console.log("2. Verify contracts on block explorer");
        console.log("3. Test rewards functionality");
        console.log("4. Consider adjusting emission rates based on usage");
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
    }

    // ============ Helper Functions ============

    /**
     * @notice Get deployment addresses for easy reference
     * @return dreamLendAddr DreamLend contract address
     * @return dreamerTokenAddr DreamerToken contract address
     * @return rewardsDistributorAddr RewardsDistributor contract address
     */
    function getDeploymentAddresses()
        external
        view
        returns (
            address dreamLendAddr,
            address dreamerTokenAddr,
            address rewardsDistributorAddr
        )
    {
        return (
            address(dreamLend),
            address(dreamerToken),
            address(rewardsDistributor)
        );
    }

    /**
     * @notice Calculate estimated rewards for testing
     * @param principalAmount The principal amount in wei
     * @param durationSeconds The duration in seconds
     * @return estimatedRewards The estimated rewards in wei
     */
    function calculateEstimatedRewards(
        uint256 principalAmount,
        uint256 durationSeconds
    ) external view returns (uint256 estimatedRewards) {
        // Simplified calculation assuming user has 100% of total principal
        // In reality, rewards are shared proportionally among all participants
        estimatedRewards = INITIAL_REWARDS_PER_SECOND * durationSeconds;
        return estimatedRewards;
    }
}
