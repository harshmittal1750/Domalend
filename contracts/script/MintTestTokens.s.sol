// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockTokens.sol";

/**
 * @title MintTestTokens
 * @dev Script to mint test tokens to any address
 * @notice Run with: forge script script/MintTestTokens.s.sol --rpc-url <SOMNIA_L1_TESTNET_RPC> --private-key <PRIVATE_KEY> --broadcast
 */
contract MintTestTokensScript is Script {
    // Update these addresses after deploying mock tokens
    address public constant MOCK_USDT = 0x5ed251DE90afda57efF0e5DD404B4f9A460B59DD; // UPDATE AFTER DEPLOYMENT
    address public constant MOCK_USDC = 0x1A6e9aa85404FCC833eE0A464aAe10B9369EBA27; // UPDATE AFTER DEPLOYMENT
    address public constant MOCK_WBTC = 0xf3cA369540be8cd75e78fC2D279271aDC24E1C58; // UPDATE AFTER DEPLOYMENT
    address public constant MOCK_ARB = 0x33dCbE5C55827F4Cd04129F48378838D145F0728; // UPDATE AFTER DEPLOYMENT
    address public constant MOCK_SOL = 0x3ECf5cC10EC240307A35bc28faDf500EB0932b28; // UPDATE AFTER DEPLOYMENT

    function setUp() public {}

    /**
     * @notice Mint test tokens to the caller
     */
    function run() public {
        vm.startBroadcast();

        address recipient = msg.sender;
        console.log("Minting test tokens to:", recipient);

        _mintTokensTo(recipient);

        vm.stopBroadcast();
    }

    /**
     * @notice Mint test tokens to a specific address
     * @param recipient Address to receive the tokens
     */
    function mintTo(address recipient) public {
        vm.startBroadcast();

        console.log("Minting test tokens to:", recipient);
        _mintTokensTo(recipient);

        vm.stopBroadcast();
    }

    /**
     * @notice Internal function to mint tokens
     */
    function _mintTokensTo(address recipient) internal {
        if (MOCK_USDT != address(0)) {
            MockERC20(MOCK_USDT).mint(recipient, 50_000 * 10 ** 6); // 50K USDT
            console.log("Minted 50,000 MUSDT to:", recipient);
        }

        if (MOCK_USDC != address(0)) {
            MockERC20(MOCK_USDC).mint(recipient, 50_000 * 10 ** 6); // 50K USDC
            console.log("Minted 50,000 MUSDC to:", recipient);
        }

        if (MOCK_WBTC != address(0)) {
            MockERC20(MOCK_WBTC).mint(recipient, 50 * 10 ** 8); // 50 WBTC
            console.log("Minted 50 MWBTC to:", recipient);
        }

        if (MOCK_ARB != address(0)) {
            MockERC20(MOCK_ARB).mint(recipient, 500_000 * 10 ** 18); // 500K ARB
            console.log("Minted 500,000 MARB to:", recipient);
        }

        if (MOCK_SOL != address(0)) {
            MockERC20(MOCK_SOL).mint(recipient, 5_000 * 10 ** 18); // 5K SOL
            console.log("Minted 5,000 MSOL to:", recipient);
        }

        console.log("All test tokens minted successfully!");
    }

    /**
     * @notice Get current token balances for an address
     */
    function checkBalances(address account) public view {
        console.log("Token balances for:", account);

        if (MOCK_USDT != address(0)) {
            uint256 usdtBalance = MockERC20(MOCK_USDT).balanceOf(account);
            console.log("MUSDT:", usdtBalance / 10 ** 6, "tokens");
        }

        if (MOCK_USDC != address(0)) {
            uint256 usdcBalance = MockERC20(MOCK_USDC).balanceOf(account);
            console.log("MUSDC:", usdcBalance / 10 ** 6, "tokens");
        }

        if (MOCK_WBTC != address(0)) {
            uint256 wbtcBalance = MockERC20(MOCK_WBTC).balanceOf(account);
            console.log("MWBTC:", wbtcBalance / 10 ** 8, "tokens");
        }

        if (MOCK_ARB != address(0)) {
            uint256 arbBalance = MockERC20(MOCK_ARB).balanceOf(account);
            console.log("MARB:", arbBalance / 10 ** 18, "tokens");
        }

        if (MOCK_SOL != address(0)) {
            uint256 solBalance = MockERC20(MOCK_SOL).balanceOf(account);
            console.log("MSOL:", solBalance / 10 ** 18, "tokens");
        }
    }
}

