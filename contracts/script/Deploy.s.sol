// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DreamLend} from "../src/DreamLend.sol";
import {DomaRankOracle} from "../src/DomaRankOracle.sol";

/**
 * @title DreamLend + DomaRankOracle Deployment Script
 * @dev Deployment script for DreamLend protocol and DomaRank oracle
 * @notice Deploys both contracts and configures them together
 *
 * Usage:
 * - Doma Testnet: forge script script/Deploy.s.sol --rpc-url https://rpc-testnet.doma.xyz --private-key <PRIVATE_KEY> --broadcast
 * - Somnia Testnet: forge script script/Deploy.s.sol --rpc-url <SOMNIA_RPC> --private-key <PRIVATE_KEY> --broadcast
 */
contract DreamLendScript is Script {
    DreamLend public dreamLend;
    DomaRankOracle public domaRankOracle;

    function setUp() public {}

    function run() public {
        // Start broadcasting transactions
        vm.startBroadcast();

        console.log("=======================================================");
        console.log("DreamLend + DomaRank Oracle Deployment");
        console.log("=======================================================");
        console.log("Deployer address:", msg.sender);
        console.log("Chain ID:", block.chainid);
        console.log("");

        // ============================================
        // Step 1: Deploy DomaRankOracle
        // ============================================
        console.log("Step 1: Deploying DomaRankOracle...");
        domaRankOracle = new DomaRankOracle();
        console.log("DomaRankOracle deployed to:", address(domaRankOracle));
        console.log("Oracle owner:", domaRankOracle.owner());
        console.log("");

        // ============================================
        // Step 2: Deploy DreamLend
        // ============================================
        console.log("Step 2: Deploying DreamLend...");
        dreamLend = new DreamLend();
        console.log("DreamLend deployed to:", address(dreamLend));
        console.log("DreamLend owner:", dreamLend.owner());
        console.log("");

        // ============================================
        // Step 3: Configure DreamLend with DomaRank Oracle
        // ============================================
        console.log("Step 3: Configuring DreamLend with DomaRank Oracle...");
        dreamLend.setDomaRankOracle(address(domaRankOracle));
        console.log("DomaRank Oracle configured in DreamLend");
        console.log(
            "Oracle address in DreamLend:",
            dreamLend.domaRankOracleAddress()
        );
        console.log("");

        // ============================================
        // Deployment Summary
        // ============================================
        console.log("=======================================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("=======================================================");
        console.log("DomaRankOracle:", address(domaRankOracle));
        console.log("DreamLend:", address(dreamLend));
        console.log("Deployer:", msg.sender);
        console.log("Chain ID:", block.chainid);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update your .env file with these addresses:");
        console.log("   DOMA_RANK_ORACLE_ADDRESS=", address(domaRankOracle));
        console.log("   DREAM_LEND_ADDRESS=", address(dreamLend));
        console.log("2. Start the backend oracle service:");
        console.log("   cd backend && npm run backend");
        console.log("3. Verify contracts on block explorer");
        console.log("=======================================================");

        // Stop broadcasting transactions
        vm.stopBroadcast();
    }

    /**
     * @notice Verify deployment by checking contract addresses and configuration
     */
    function verifyDeployment() public view {
        require(address(dreamLend) != address(0), "DreamLend not deployed");
        require(
            address(domaRankOracle) != address(0),
            "DomaRankOracle not deployed"
        );
        require(
            dreamLend.domaRankOracleAddress() == address(domaRankOracle),
            "Oracle not configured in DreamLend"
        );

        console.log("=======================================================");
        console.log("DEPLOYMENT VERIFICATION");
        console.log("=======================================================");
        console.log("DreamLend contract:", address(dreamLend));
        console.log("DomaRankOracle contract:", address(domaRankOracle));
        console.log(
            "Oracle configured correctly:",
            dreamLend.domaRankOracleAddress() == address(domaRankOracle)
        );
        console.log("Oracle owner:", domaRankOracle.owner());
        console.log("DreamLend owner:", dreamLend.owner());
        console.log("=======================================================");
        console.log("All contracts verified successfully!");
    }
}
