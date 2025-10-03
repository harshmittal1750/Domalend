// Doma Testnet - Supported Tokens Configuration
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  description: string;
  category: "stablecoin" | "crypto" | "defi" | "domain";
  volatilityTier: "stable" | "moderate" | "high";
  priceFeedAddress: string;
  hasDomaRankOracle?: boolean; // True if token is indexed by DomaRank AI Oracle
  isDomainToken?: boolean; // True if this is a Doma fractional domain token
  domainMetadata?: {
    image?: string;
    website?: string;
    twitterLink?: string;
  };
}

export const SUPPORTED_TOKENS: Record<string, TokenInfo> = {
  // === DEPLOYMENT SUMMARY ===
  //   MockUSDT (6 decimals): 0x75Ae0D4f6c603065D169EC3C4B6Ab43FA8cC6A61
  //   MockUSDC (6 decimals): 0x87c20443Ba0480677842851CB27a5b1D38C91639
  //   MockWBTC (8 decimals): 0x02BFF1B39378aCCB20b8870863f30D48b4Dc1DE4
  //   MockARB (18 decimals): 0x6E1f4b629Ea42Db26E2970aEcE38A61BB50a029f
  //   MockSOL (18 decimals): 0x457Ebd6E5ad62dF0fde31a1a144a9Ed1f1d2E38B

  // === ORACLE ADAPTER ADDRESSES (Already Configured) ===
  //   USDT Price Feed: 0x67d2C2a87A17b7267a6DBb1A59575C0E9A1D1c3e
  //   USDC Price Feed: 0x235266D5ca6f19F134421C49834C108b32C2124e
  //   BTC Price Feed:  0x4803db1ca3A1DA49c3DB991e1c390321c20e1f21
  //   ARB Price Feed:  0x74952812B6a9e4f826b2969C6D189c4425CBc19B
  //   SOL Price Feed:  0xD5Ea6C434582F827303423dA21729bEa4F87D519
  // // Mock token addresses (from deployed contracts)
  // const MOCK_TOKENS = {
  //   MUSDT: "0x75Ae0D4f6c603065D169EC3C4B6Ab43FA8cC6A61",
  //   MUSDC: "0x87c20443Ba0480677842851CB27a5b1D38C91639",
  //   MWBTC: "0x02BFF1B39378aCCB20b8870863f30D48b4Dc1DE4",
  //   MARB: "0x6E1f4b629Ea42Db26E2970aEcE38A61BB50a029f",
  //   MSOL: "0x457Ebd6E5ad62dF0fde31a1a144a9Ed1f1d2E38B",
  // };
  MUSDT: {
    address: "0x75Ae0D4f6c603065D169EC3C4B6Ab43FA8cC6A61",
    name: "Mock Tether USD",
    symbol: "MUSDT",
    decimals: 6,
    description: "Mock stablecoin for testing (pegged to USD)",
    category: "stablecoin",
    volatilityTier: "stable",
    priceFeedAddress: "0x67d2C2a87A17b7267a6DBb1A59575C0E9A1D1c3e", // Placeholder - not active on Doma
    hasDomaRankOracle: false,
  },
  MUSDC: {
    address: "0x87c20443Ba0480677842851CB27a5b1D38C91639",
    name: "Mock USD Coin",
    symbol: "MUSDC",
    decimals: 6,
    description: "Mock stablecoin for testing (backed by USD reserves)",
    category: "stablecoin",
    volatilityTier: "stable",
    priceFeedAddress: "0x235266D5ca6f19F134421C49834C108b32C2124e", // Placeholder - not active on Doma
    hasDomaRankOracle: false,
  },
  MWBTC: {
    address: "0x02BFF1B39378aCCB20b8870863f30D48b4Dc1DE4",
    name: "Mock Wrapped Bitcoin",
    symbol: "MWBTC",
    decimals: 8,
    description: "Mock tokenized Bitcoin for testing",
    category: "crypto",
    volatilityTier: "high",
    priceFeedAddress: "0x4803db1ca3A1DA49c3DB991e1c390321c20e1f21", // Placeholder - not active on Doma
    hasDomaRankOracle: false,
  },
  MARB: {
    address: "0x6E1f4b629Ea42Db26E2970aEcE38A61BB50a029f",
    name: "Mock Arbitrum",
    symbol: "MARB",
    decimals: 18,
    description: "Mock Arbitrum ecosystem token for testing",
    category: "defi",
    volatilityTier: "moderate",
    priceFeedAddress: "0x74952812B6a9e4f826b2969C6D189c4425CBc19B", // Placeholder - not active on Doma
    hasDomaRankOracle: false,
  },
  MSOL: {
    address: "0x457Ebd6E5ad62dF0fde31a1a144a9Ed1f1d2E38B",
    name: "Mock Solana",
    symbol: "MSOL",
    decimals: 18,
    description: "Mock Solana blockchain native token for testing",
    category: "crypto",
    volatilityTier: "high",
    priceFeedAddress: "0xD5Ea6C434582F827303423dA21729bEa4F87D519", // Placeholder - not active on Doma
    hasDomaRankOracle: false,
  },
  // ==================== DOMA FRACTIONAL DOMAIN TOKENS ====================
  // These are real fractional domain tokens from Doma protocol
  // Priced by DomaRank AI Oracle
  SOFTWAREAI: {
    address: "0xf2dDd2022611cCddFC088d87D355bEEC15B30d7D",
    name: "software.ai",
    symbol: "SOFTWAREAI",
    decimals: 6,
    description:
      "The Ultimate Digital Address for AI Innovation. Own and trade an ultra-premium domain in the hottest tech category.",
    category: "domain",
    volatilityTier: "high",
    priceFeedAddress: "0x0000000000000000000000000000000000000000", // Uses DomaRank Oracle
    hasDomaRankOracle: true,
    isDomainToken: true,
    domainMetadata: {
      image:
        "https://cdn-testnet.doma.xyz/fractionalization/a3190985-5ad1-4d1b-b28d-aa8bcc6c58a6/image_1758354799873_buoi20?timestamp=1758354799873",
      website: "https://mizu.xyz",
      twitterLink: "https://x.com/domaprotocol",
    },
  },
  SEEYOUATKBW: {
    address: "0xBA1Ac5CF547d1C2bdaE9aAaa588D7f081219Bc62",
    name: "seeyouatkbw.com",
    symbol: "SEEYOUATKBW",
    decimals: 6,
    description: "Fractional ownership of seeyouatkbw.com domain",
    category: "domain",
    volatilityTier: "high",
    priceFeedAddress: "0x0000000000000000000000000000000000000000", // Uses DomaRank Oracle
    hasDomaRankOracle: true,
    isDomainToken: true,
    domainMetadata: {
      image:
        "https://cdn-testnet.doma.xyz/fractionalization/24f39752-f916-4565-b45d-8a7bf71fa378/image_1758391682295_tanqsa?timestamp=1758391682295",
      website: "https://mizu.xyz",
      twitterLink: "https://x.com/domaprotocol",
    },
  },
  LABUBURIP: {
    address: "0xAf56AB93BD19a94136a808Ab3CcD8B61BFa99119",
    name: "labuburip.com",
    symbol: "LABUBURIP",
    decimals: 6,
    description: "Fractional ownership of labuburip.com domain",
    category: "domain",
    volatilityTier: "high",
    priceFeedAddress: "0x0000000000000000000000000000000000000000", // Uses DomaRank Oracle
    hasDomaRankOracle: true,
    isDomainToken: true,
    domainMetadata: {
      image:
        "https://cdn-testnet.doma.xyz/fractionalization/cce0371a-20bf-474f-8fce-e986bd2dca2d/image_1758431243173_2r1j6l?timestamp=1758431243173",
      website: "https://mizu.xyz",
      twitterLink: "https://x.com/domaprotocol",
    },
  },
  ILOVEPUMPKINSPICE: {
    address: "0x2121B21659C60Eadf39a27Fb7B9a8Ec23b215526",
    name: "ilovepumpkinspice.com",
    symbol: "ILOVEPUMPKINSPICE",
    decimals: 6,
    description: "Fractional ownership of ilovepumpkinspice.com domain",
    category: "domain",
    volatilityTier: "high",
    priceFeedAddress: "0x0000000000000000000000000000000000000000", // Uses DomaRank Oracle
    hasDomaRankOracle: true,
    isDomainToken: true,
    domainMetadata: {
      image:
        "https://cdn-testnet.doma.xyz/fractionalization/68ae2ff7-e5a2-4a2c-9d1f-f4c76a835a05/image_1758431790701_007995?timestamp=1758431790701",
      website: "https://mizu.xyz",
      twitterLink: "https://x.com/domaprotocol",
    },
  },
  DRINKMIZU: {
    address: "0xF547543382fe62C6Da7bB862a0765b95E0269661",
    name: "drinkmizu.com",
    symbol: "DRINKMIZU.COM",
    decimals: 6,
    description:
      "Drink Mizu — Stay Moist, Bestie. You're 73% water, but actin' like 12%. Fix that with Drink Mizu, the hydration glow-up your cells deserve.",
    category: "domain",
    volatilityTier: "high",
    priceFeedAddress: "0x0000000000000000000000000000000000000000", // Uses DomaRank Oracle
    hasDomaRankOracle: true,
    isDomainToken: true,
    domainMetadata: {
      image:
        "https://cdn-testnet.doma.xyz/fractionalization/ccebc3b3-4197-4b3b-b2f8-46587f6cd80d/image_1759385373125_s1qz8p?timestamp=1759385373126",
      website: "https://mizu.xyz/",
      twitterLink: "https://x.com/domaprotocol",
    },
  },
} as const;

// Get token by address
export function getTokenByAddress(address: string): TokenInfo | undefined {
  return Object.values(SUPPORTED_TOKENS).find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}

// Get token by symbol
export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS[symbol.toUpperCase()];
}

// Get all supported tokens as array
export function getAllSupportedTokens(): TokenInfo[] {
  return Object.values(SUPPORTED_TOKENS);
}

// Default collateralization parameters based on asset volatility
export const DEFAULT_PARAMETERS = {
  stable: {
    minCollateralRatio: 15000, // 150%
    liquidationThreshold: 12000, // 120%
    maxPriceStaleness: 3600, // 1 hour
  },
  moderate: {
    minCollateralRatio: 16500, // 165%
    liquidationThreshold: 13000, // 130%
    maxPriceStaleness: 3600, // 1 hour
  },
  high: {
    minCollateralRatio: 18000, // 180%
    liquidationThreshold: 14000, // 140%
    maxPriceStaleness: 1800, // 30 minutes
  },
} as const;

// Get recommended parameters for asset pair
export function getRecommendedParameters(
  loanAsset: TokenInfo,
  collateralAsset: TokenInfo
) {
  const loanParams = DEFAULT_PARAMETERS[loanAsset.volatilityTier];
  const collateralParams = DEFAULT_PARAMETERS[collateralAsset.volatilityTier];

  // Use more conservative parameters
  return {
    minCollateralRatio: Math.max(
      loanParams.minCollateralRatio,
      collateralParams.minCollateralRatio
    ),
    liquidationThreshold: Math.max(
      loanParams.liquidationThreshold,
      collateralParams.liquidationThreshold
    ),
    maxPriceStaleness: Math.min(
      loanParams.maxPriceStaleness,
      collateralParams.maxPriceStaleness
    ),
  };
}

// Token selection categories for UI
export const TOKEN_CATEGORIES = {
  stablecoin: {
    name: "Stablecoins",
    description: "Low volatility, USD-pegged assets",
    tokens: Object.values(SUPPORTED_TOKENS).filter(
      (t) => t.category === "stablecoin"
    ),
  },
  crypto: {
    name: "Cryptocurrencies",
    description: "Major blockchain native tokens",
    tokens: Object.values(SUPPORTED_TOKENS).filter(
      (t) => t.category === "crypto"
    ),
  },
  defi: {
    name: "DeFi Tokens",
    description: "Decentralized finance protocol tokens",
    tokens: Object.values(SUPPORTED_TOKENS).filter(
      (t) => t.category === "defi"
    ),
  },
  domain: {
    name: "Domain Tokens",
    description: "Fractional ownership of premium domains (AI-priced)",
    tokens: Object.values(SUPPORTED_TOKENS).filter(
      (t) => t.category === "domain" && t.hasDomaRankOracle
    ),
  },
} as const;

// Get tokens with DomaRank oracle support
export function getDomaRankTokens(): TokenInfo[] {
  return Object.values(SUPPORTED_TOKENS).filter(
    (token) => token.hasDomaRankOracle === true
  );
}

// Get tokens without DomaRank oracle (standard tokens)
export function getStandardTokens(): TokenInfo[] {
  return Object.values(SUPPORTED_TOKENS).filter(
    (token) => !token.hasDomaRankOracle
  );
}

// Check if a token has DomaRank oracle support
export function hasDomaRankOracleSupport(tokenAddress: string): boolean {
  const token = getTokenByAddress(tokenAddress);
  return token?.hasDomaRankOracle === true;
}

// Risk level colors for UI
export const RISK_COLORS = {
  stable: "text-green-600 bg-green-50 border-green-200",
  moderate: "text-yellow-600 bg-yellow-50 border-yellow-200",
  high: "text-red-600 bg-red-50 border-red-200",
} as const;

// Format basis points to percentage
export function formatBasisPoints(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

// Convert percentage to basis points (for contract calls)
export function percentageToBasisPoints(percentage: number): number {
  return Math.round(percentage * 100);
}

// Convert basis points to percentage (for display)
export function basisPointsToPercentage(bps: number): number {
  return bps / 100;
}

// Get price feed address for a token
export function getPriceFeedAddress(tokenAddress: string): string | undefined {
  const token = getTokenByAddress(tokenAddress);
  return token?.priceFeedAddress;
}

// Format duration in seconds to human readable
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}
