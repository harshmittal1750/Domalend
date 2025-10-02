// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev Base mock ERC20 token for testing DreamLend protocol
 * @notice This is for testing purposes only - not for production use
 */
contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens to any address (for testing)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Mint tokens to caller (for easy testing)
     * @param amount Amount of tokens to mint to caller
     */
    function mintToSelf(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

/**
 * @title MockUSDT
 * @dev Mock USDT token with 6 decimals (like real USDT)
 */
contract MockUSDT is MockERC20 {
    constructor()
        MockERC20(
            "Mock Tether USD",
            "MUSDT",
            6,
            1_000_000 * 10 ** 6 // 1M USDT initial supply
        )
    {}
}

/**
 * @title MockUSDC
 * @dev Mock USDC token with 6 decimals (like real USDC)
 */
contract MockUSDC is MockERC20 {
    constructor()
        MockERC20(
            "Mock USD Coin",
            "MUSDC",
            6,
            1_000_000 * 10 ** 6 // 1M USDC initial supply
        )
    {}
}

/**
 * @title MockWBTC
 * @dev Mock Wrapped Bitcoin with 8 decimals (like real WBTC)
 */
contract MockWBTC is MockERC20 {
    constructor()
        MockERC20(
            "Mock Wrapped Bitcoin",
            "MWBTC",
            8,
            1_000 * 10 ** 8 // 1K WBTC initial supply
        )
    {}
}

/**
 * @title MockARB
 * @dev Mock Arbitrum token with 18 decimals
 */
contract MockARB is MockERC20 {
    constructor()
        MockERC20(
            "Mock Arbitrum",
            "MARB",
            18,
            10_000_000 * 10 ** 18 // 10M ARB initial supply
        )
    {}
}

/**
 * @title MockSOL
 * @dev Mock Solana token with 18 decimals (for EVM compatibility)
 */
contract MockSOL is MockERC20 {
    constructor()
        MockERC20(
            "Mock Solana",
            "MSOL",
            18,
            100_000 * 10 ** 18 // 100K SOL initial supply
        )
    {}
}

