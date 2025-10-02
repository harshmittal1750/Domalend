// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DreamLend} from "../src/DreamLend.sol";

/**
 * @title DreamLend Deployment Script
 * @dev Deployment script for DreamLend protocol on Somnia L1 testnet
 * @notice Run with: forge script script/Deploy.s.sol --rpc-url <SOMNIA_L1_TESTNET_RPC> --private-key <PRIVATE_KEY> --broadcast
 */
contract DreamLendScript is Script {
    DreamLend public dreamLend;

    function setUp() public {}

    function run() public {
        // Start broadcasting transactions
        vm.startBroadcast();

        console.log("Deploying DreamLend to Somnia L1 testnet...");
        console.log("Deployer address:", msg.sender);

        // Deploy DreamLend contract
        dreamLend = new DreamLend();

        console.log("DreamLend deployed to:", address(dreamLend));
        console.log("Deployment successful!");

        // Stop broadcasting transactions
        vm.stopBroadcast();
    }

    /**
     * @notice Verify deployment by checking contract address
     */
    function verifyDeployment() public view {
        require(address(dreamLend) != address(0), "DreamLend not deployed");
        console.log("DreamLend contract verified at:", address(dreamLend));
    }
}
