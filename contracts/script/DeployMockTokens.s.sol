// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDT, MockUSDC, MockWBTC, MockARB, MockSOL} from "../src/MockTokens.sol";

/**
 * @title DeployMockTokens
 * @dev Deployment script for mock ERC20 tokens on Somnia L1 testnet
 * @notice Run with: forge script script/DeployMockTokens.s.sol --rpc-url <SOMNIA_L1_TESTNET_RPC> --private-key <PRIVATE_KEY> --broadcast
 */
contract DeployMockTokensScript is Script {
    MockUSDT public mockUSDT;
    MockUSDC public mockUSDC;
    MockWBTC public mockWBTC;
    MockARB public mockARB;
    MockSOL public mockSOL;

    function setUp() public {}

    function run() public {
        // Start broadcasting transactions
        vm.startBroadcast();

        console.log("Deploying Mock Tokens to Somnia L1 testnet...");
        console.log("Deployer address:", msg.sender);

        // Deploy all mock tokens
        mockUSDT = new MockUSDT();
        console.log("MockUSDT deployed to:", address(mockUSDT));

        mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed to:", address(mockUSDC));

        mockWBTC = new MockWBTC();
        console.log("MockWBTC deployed to:", address(mockWBTC));

        mockARB = new MockARB();
        console.log("MockARB deployed to:", address(mockARB));

        mockSOL = new MockSOL();
        console.log("MockSOL deployed to:", address(mockSOL));

        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("MockUSDT (6 decimals):", address(mockUSDT));
        console.log("MockUSDC (6 decimals):", address(mockUSDC));
        console.log("MockWBTC (8 decimals):", address(mockWBTC));
        console.log("MockARB (18 decimals):", address(mockARB));
        console.log("MockSOL (18 decimals):", address(mockSOL));

        console.log("\n=== ORACLE ADAPTER ADDRESSES (Already Configured) ===");
        console.log(
            "USDT Price Feed: 0x67d2C2a87A17b7267a6DBb1A59575C0E9A1D1c3e"
        );
        console.log(
            "USDC Price Feed: 0x235266D5ca6f19F134421C49834C108b32C2124e"
        );
        console.log(
            "BTC Price Feed:  0x4803db1ca3A1DA49c3DB991e1c390321c20e1f21"
        );
        console.log(
            "ARB Price Feed:  0x74952812B6a9e4f826b2969C6D189c4425CBc19B"
        );
        console.log(
            "SOL Price Feed:  0xD5Ea6C434582F827303423dA21729bEa4F87D519"
        );

        console.log("\n=== NEXT STEPS ===");
        console.log(
            "1. Update SomniaConfig.sol with the deployed token addresses"
        );
        console.log(
            "2. Update src/config/tokens.ts with the deployed token addresses"
        );
        console.log(
            "3. Redeploy DreamLend contract with updated configuration"
        );
        console.log("4. Mint test tokens using the mintToSelf() function");

        // Stop broadcasting transactions
        vm.stopBroadcast();
    }

    /**
     * @notice Mint test tokens to a specific address (useful for testing)
     * @param recipient Address to mint tokens to
     */
    function mintTestTokens(address recipient) public {
        vm.startBroadcast();

        console.log("Minting test tokens to:", recipient);

        // Mint test amounts
        mockUSDT.mint(recipient, 10_000 * 10 ** 6); // 10K USDT
        mockUSDC.mint(recipient, 10_000 * 10 ** 6); // 10K USDC
        mockWBTC.mint(recipient, 10 * 10 ** 8); // 10 WBTC
        mockARB.mint(recipient, 100_000 * 10 ** 18); // 100K ARB
        mockSOL.mint(recipient, 1_000 * 10 ** 18); // 1K SOL

        console.log("Test tokens minted successfully!");

        vm.stopBroadcast();
    }

    /**
     * @notice Verify deployment by checking all contract addresses
     */
    function verifyDeployment() public view {
        require(address(mockUSDT) != address(0), "MockUSDT not deployed");
        require(address(mockUSDC) != address(0), "MockUSDC not deployed");
        require(address(mockWBTC) != address(0), "MockWBTC not deployed");
        require(address(mockARB) != address(0), "MockARB not deployed");
        require(address(mockSOL) != address(0), "MockSOL not deployed");

        console.log("All mock tokens verified successfully!");
    }
}

