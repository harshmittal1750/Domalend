// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title SomniaConfig
 * @dev Configuration contract for Somnia L1 testnet DIA Oracle integration
 * @notice Contains all supported token addresses and their DIA adapter addresses
 */
library SomniaConfig {
    // ============ Somnia Testnet Configuration ============

    // DIA Oracle contract address
    address public constant DIA_ORACLE_V2 =
        0x9206296Ea3aEE3E6bdC07F7AaeF14DfCf33d865D;

    // Supported Asset Oracle Adapters (AggregatorV3Interface compatible)
    address public constant USDT_PRICE_FEED =
        0x67d2C2a87A17b7267a6DBb1A59575C0E9A1D1c3e;
    address public constant USDC_PRICE_FEED =
        0x235266D5ca6f19F134421C49834C108b32C2124e;
    address public constant BTC_PRICE_FEED =
        0x4803db1ca3A1DA49c3DB991e1c390321c20e1f21;
    address public constant ARB_PRICE_FEED =
        0x74952812B6a9e4f826b2969C6D189c4425CBc19B;
    address public constant SOL_PRICE_FEED =
        0xD5Ea6C434582F827303423dA21729bEa4F87D519;

    // ============ TOKEN ADDRESSES - CRITICAL NOTICE ============
    //
    // ⚠️  IMPORTANT: ALL TOKEN ADDRESSES BELOW ARE PLACEHOLDERS ⚠️
    //
    // These addresses MUST be replaced with the actual, official token contract
    // addresses deployed on the Somnia Testnet (or mainnet) before production use.
    //
    // Current Status:
    // - USDT_TOKEN, USDC_TOKEN, BTC_TOKEN, SOL_TOKEN: Placeholder addresses
    // - ARB_TOKEN: Set to address(0) indicating it's unassigned/placeholder
    //
    // Before deploying to production:
    // 1. Obtain the official token contract addresses from Somnia documentation
    // 2. Verify each address corresponds to the correct token contract
    // 3. Update all addresses below with the verified official addresses
    // 4. Remove this warning comment block
    //
    // Failure to update these addresses will result in:
    // - Integration with wrong/non-existent token contracts
    // - Potential loss of funds
    // - Protocol malfunction
    //
    // =========================================================

    // Token addresses on Somnia testnet (PLACEHOLDER ADDRESSES - REPLACE BEFORE PRODUCTION)
    address public constant USDT_TOKEN =
        address(0x5C99fEb638C1959144696a77CC900c58A4B4EB6F);
    address public constant USDC_TOKEN =
        address(0x571D9915eA4D187b7f0b1460fd0432D7Cce74c47);
    address public constant BTC_TOKEN =
        address(0xE218717fE38D582B8C00a8D6363f5BC7BF32a8B6);
    address public constant ARB_TOKEN =
        address(0x9c15F281BFC66D2FA26686aE2E297eD5d7f61ee1);
    address public constant SOL_TOKEN =
        address(0x71264e1321E1980b32002EAF6b24759DfBA5E281);

    // Default oracle parameters
    uint256 public constant DEFAULT_MIN_COLLATERAL_RATIO = 15000; // 150%
    uint256 public constant DEFAULT_LIQUIDATION_THRESHOLD = 12000; // 120%
    uint256 public constant DEFAULT_MAX_PRICE_STALENESS = 86400; // 1 day TESTNET ONLY (0.5-1 hour for mainnet)
    uint256 public constant AGGRESSIVE_MAX_PRICE_STALENESS = 86400; // 1 day for volatile assets TESTNET ONLY (0.5-1 hour for mainnet)

    // Asset volatility tiers for different staleness requirements
    enum VolatilityTier {
        STABLE, // USDT, USDC
        MODERATE, // ARB
        HIGH // BTC, SOL
    }

    /**
     * @notice Get recommended collateral ratio for asset pair
     * @param loanAsset The asset being borrowed
     * @param collateralAsset The asset being used as collateral
     * @return minRatio Minimum collateral ratio in basis points
     * @return liquidationThreshold Liquidation threshold in basis points
     */
    function getRecommendedRatios(
        address loanAsset,
        address collateralAsset
    ) internal pure returns (uint256 minRatio, uint256 liquidationThreshold) {
        VolatilityTier loanTier = getAssetVolatilityTier(loanAsset);
        VolatilityTier collateralTier = getAssetVolatilityTier(collateralAsset);

        // Base ratios
        minRatio = DEFAULT_MIN_COLLATERAL_RATIO;
        liquidationThreshold = DEFAULT_LIQUIDATION_THRESHOLD;

        // Adjust for volatility - higher volatility = higher ratios
        if (collateralTier == VolatilityTier.HIGH) {
            minRatio += 3000; // +30%
            liquidationThreshold += 2000; // +20%
        } else if (collateralTier == VolatilityTier.MODERATE) {
            minRatio += 1500; // +15%
            liquidationThreshold += 1000; // +10%
        }

        if (loanTier == VolatilityTier.HIGH) {
            minRatio += 1500; // +15%
            liquidationThreshold += 1000; // +10%
        }
    }

    /**
     * @notice Get asset volatility tier
     */
    function getAssetVolatilityTier(
        address asset
    ) internal pure returns (VolatilityTier) {
        if (asset == USDT_TOKEN || asset == USDC_TOKEN) {
            return VolatilityTier.STABLE;
        } else if (asset == ARB_TOKEN) {
            return VolatilityTier.MODERATE;
        } else if (asset == BTC_TOKEN || asset == SOL_TOKEN) {
            return VolatilityTier.HIGH;
        }

        // Default to high volatility for unknown assets
        return VolatilityTier.HIGH;
    }

    /**
     * @notice Get recommended staleness threshold for asset
     */
    function getRecommendedStaleness(
        address asset
    ) internal pure returns (uint256) {
        VolatilityTier tier = getAssetVolatilityTier(asset);

        if (tier == VolatilityTier.HIGH) {
            return AGGRESSIVE_MAX_PRICE_STALENESS; // 30 minutes for volatile assets
        }

        return DEFAULT_MAX_PRICE_STALENESS; // 1 hour for stable/moderate assets
    }

    /**
     * @notice Get price feed address for a token
     */
    function getPriceFeed(address token) internal pure returns (address) {
        if (token == USDT_TOKEN) return USDT_PRICE_FEED;
        if (token == USDC_TOKEN) return USDC_PRICE_FEED;
        if (token == BTC_TOKEN) return BTC_PRICE_FEED;
        if (token == ARB_TOKEN) return ARB_PRICE_FEED;
        if (token == SOL_TOKEN) return SOL_PRICE_FEED;

        return address(0); // Unsupported token
    }

    /**
     * @notice Check if token is supported
     */
    function isTokenSupported(address token) internal pure returns (bool) {
        return getPriceFeed(token) != address(0);
    }

    /**
     * @notice Get all supported tokens
     */
    function getSupportedTokens()
        internal
        pure
        returns (address[] memory tokens, address[] memory priceFeeds)
    {
        tokens = new address[](5);
        priceFeeds = new address[](5);

        tokens[0] = USDT_TOKEN;
        tokens[1] = USDC_TOKEN;
        tokens[2] = BTC_TOKEN;
        tokens[3] = ARB_TOKEN;
        tokens[4] = SOL_TOKEN;

        priceFeeds[0] = USDT_PRICE_FEED;
        priceFeeds[1] = USDC_PRICE_FEED;
        priceFeeds[2] = BTC_PRICE_FEED;
        priceFeeds[3] = ARB_PRICE_FEED;
        priceFeeds[4] = SOL_PRICE_FEED;
    }
}
