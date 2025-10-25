// Doma Testnet - Supported Tokens Configuration
import { FRACTIONAL_TOKENS_QUERY } from "@/lib/graphql/queries";
import { FractionalTokensResponse } from "@/lib/graphql/types";

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
  hasDomaRankOracle?: boolean; // True if token is valued by DomaRank algorithm
  isDomainToken?: boolean; // True if this is a Doma fractional domain token
  poolAddress?: string; // Uniswap pool address for the token
  domainMetadata?: {
    image?: string;
    website?: string;
    twitterLink?: string;
  };
}

export const SUPPORTED_TOKENS: Record<string, TokenInfo> = {
  // === DEPLOYMENT SUMMARY ===
  //   USDTEST (6 decimals): 0x8725f6FDF6E240C303B4e7A60AD13267Fa04d55C - Official Doma Testnet Token
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
  //   USDTEST: "0x8725f6FDF6E240C303B4e7A60AD13267Fa04d55C",
  //   MUSDC: "0x87c20443Ba0480677842851CB27a5b1D38C91639",
  //   MWBTC: "0x02BFF1B39378aCCB20b8870863f30D48b4Dc1DE4",
  //   MARB: "0x6E1f4b629Ea42Db26E2970aEcE38A61BB50a029f",
  //   MSOL: "0x457Ebd6E5ad62dF0fde31a1a144a9Ed1f1d2E38B",
  // };
  USDTEST: {
    address: "0x8725f6FDF6E240C303B4e7A60AD13267Fa04d55C",
    name: "USD Test Token",
    symbol: "USDTEST",
    decimals: 6,
    description: "Official Doma testnet stablecoin (pegged to USD)",
    category: "stablecoin",
    volatilityTier: "stable",
    priceFeedAddress: "0x67d2C2a87A17b7267a6DBb1A59575C0E9A1D1c3e", // Placeholder - not active on Doma
    hasDomaRankOracle: true, // Uses DomaRank Oracle with CoinGecko prices
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
    hasDomaRankOracle: true, // Uses DomaRank Oracle with CoinGecko prices
  },
  MWBTC: {
    address: "0x02BFF1B39378aCCB20b8870863f30D48b4Dc1DE4",
    name: "Mock Wrapped Bitcoin",
    symbol: "MWBTC",
    decimals: 8,
    description: "Mock tokenized Bitcoin for testing (CoinGecko price feed)",
    category: "crypto",
    volatilityTier: "high",
    priceFeedAddress: "0x4803db1ca3A1DA49c3DB991e1c390321c20e1f21", // Placeholder - not active on Doma
    hasDomaRankOracle: true, // Uses DomaRank Oracle with CoinGecko prices
  },
  MARB: {
    address: "0x6E1f4b629Ea42Db26E2970aEcE38A61BB50a029f",
    name: "Mock Arbitrum",
    symbol: "MARB",
    decimals: 18,
    description: "Mock Arbitrum ecosystem token (CoinGecko price feed)",
    category: "defi",
    volatilityTier: "moderate",
    priceFeedAddress: "0x74952812B6a9e4f826b2969C6D189c4425CBc19B", // Placeholder - not active on Doma
    hasDomaRankOracle: true, // Uses DomaRank Oracle with CoinGecko prices
  },
  MSOL: {
    address: "0x457Ebd6E5ad62dF0fde31a1a144a9Ed1f1d2E38B",
    name: "Mock Solana",
    symbol: "MSOL",
    decimals: 18,
    description: "Mock Solana blockchain native token (CoinGecko price feed)",
    category: "crypto",
    volatilityTier: "high",
    priceFeedAddress: "0xD5Ea6C434582F827303423dA21729bEa4F87D519", // Placeholder - not active on Doma
    hasDomaRankOracle: true, // Uses DomaRank Oracle with CoinGecko prices
  },
  // ==================== DOMA FRACTIONAL DOMAIN TOKENS ====================
  // Domain tokens are now fetched dynamically from GraphQL API
  // Use getAllSupportedTokens() or getDomaRankTokens() to get the full list
} as const;

// Get token by address (checks both static and cached domain tokens)
export function getTokenByAddress(address: string): TokenInfo | undefined {
  const allTokens = getAllSupportedTokensSync();
  return allTokens.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}

// Get token by symbol
export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS[symbol.toUpperCase()];
}

// Cached domain tokens
let cachedDomainTokens: TokenInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

// Fetch domain tokens from GraphQL API
async function fetchDomainTokens(): Promise<TokenInfo[]> {
  try {
    console.log("[fetchDomainTokens] Starting fetch from GraphQL API...");
    const response = await fetch("https://api-testnet.doma.xyz/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.NEXT_PUBLIC_DOMA_API_KEY || "",
      },
      body: JSON.stringify({
        query: FRACTIONAL_TOKENS_QUERY,
      }),
    });

    console.log(
      "[fetchDomainTokens] Response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      console.warn("Failed to fetch domain tokens from GraphQL");
      return [];
    }

    const result: FractionalTokensResponse = await response.json();
    console.log("[fetchDomainTokens] Full GraphQL response:", result);

    // Check for GraphQL errors
    if (result.errors && result.errors.length > 0) {
      console.error("❌ GraphQL errors:", result.errors);
      return [];
    }

    if (!result.data || !result.data.fractionalTokens) {
      console.error("❌ No data in response:", result);
      return [];
    }

    const items = result.data.fractionalTokens.items || [];

    console.log(
      `[fetchDomainTokens] Fetched ${items.length} domain tokens from GraphQL:`,
      items.map((item: any) => ({
        address: item.address,
        symbol: item.params?.symbol,
        poolAddress: item.poolAddress,
      }))
    );

    const domainTokens = items.map((item: any) => ({
      address: item.address,
      name: item.name || item.params?.symbol || "Unknown Domain",
      symbol: item.params?.symbol || "DOMAIN",
      decimals: Number(item.params?.decimals || 6),
      description:
        item.metadata?.description ||
        item.metadata?.title ||
        `Fractional ownership of ${item.name || "domain"}`,
      category: "domain" as const,
      volatilityTier: "high" as const,
      priceFeedAddress: "0x0000000000000000000000000000000000000000",
      hasDomaRankOracle: true,
      isDomainToken: true,
      poolAddress: item.poolAddress,
      domainMetadata: {
        image: item.metadata?.image,
        website: item.metadata?.primaryWebsite || "https://mizu.xyz",
        twitterLink: item.metadata?.xLink || "https://x.com/domaprotocol",
      },
    }));

    console.log("[fetchDomainTokens] Processed domain tokens:", domainTokens);
    return domainTokens;
  } catch (error) {
    console.error("Error fetching domain tokens:", error);
    return [];
  }
}

// Get all supported tokens as array (static + dynamic domain tokens)
// Note: This is an async function - use it once to initialize, then use sync version
export async function getAllSupportedTokensAsync(): Promise<TokenInfo[]> {
  const staticTokens = Object.values(SUPPORTED_TOKENS);

  // Check cache
  const now = Date.now();
  if (cachedDomainTokens && now - cacheTimestamp < CACHE_DURATION) {
    return [...staticTokens, ...cachedDomainTokens];
  }

  // Fetch fresh domain tokens
  const domainTokens = await fetchDomainTokens();
  cachedDomainTokens = domainTokens;
  cacheTimestamp = now;

  console.log(`✅ Fetched ${domainTokens.length} domain tokens from GraphQL`);
  return [...staticTokens, ...domainTokens];
}

// Synchronous version that returns static tokens + cached domain tokens
export function getAllSupportedTokensSync(): TokenInfo[] {
  const staticTokens = Object.values(SUPPORTED_TOKENS);
  return cachedDomainTokens
    ? [...staticTokens, ...cachedDomainTokens]
    : staticTokens;
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

// Get tokens with DomaRank oracle support (domain tokens)
export async function getDomaRankTokensAsync(): Promise<TokenInfo[]> {
  const allTokens = await getAllSupportedTokensAsync();
  return allTokens.filter(
    (token) => token.hasDomaRankOracle === true && token.isDomainToken === true
  );
}

// Synchronous version
export function getDomaRankTokensSync(): TokenInfo[] {
  const allTokens = getAllSupportedTokensSync();
  return allTokens.filter(
    (token) => token.hasDomaRankOracle === true && token.isDomainToken === true
  );
}

// Get crypto tokens with oracle support (non-domain tokens)
export async function getCryptoTokensAsync(): Promise<TokenInfo[]> {
  const allTokens = await getAllSupportedTokensAsync();
  return allTokens.filter(
    (token) => token.hasDomaRankOracle === true && token.isDomainToken !== true
  );
}

// Synchronous version
export function getCryptoTokensSync(): TokenInfo[] {
  const allTokens = getAllSupportedTokensSync();
  return allTokens.filter(
    (token) => token.hasDomaRankOracle === true && token.isDomainToken !== true
  );
}

// Get tokens without DomaRank oracle (standard tokens)
export async function getStandardTokensAsync(): Promise<TokenInfo[]> {
  const allTokens = await getAllSupportedTokensAsync();
  return allTokens.filter((token) => !token.hasDomaRankOracle);
}

// Synchronous version
export function getStandardTokensSync(): TokenInfo[] {
  const allTokens = getAllSupportedTokensSync();
  return allTokens.filter((token) => !token.hasDomaRankOracle);
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

// Export the sync version as default for backwards compatibility
export { getAllSupportedTokensSync as getAllSupportedTokens };
export { getCryptoTokensSync as getCryptoTokens };
export { getDomaRankTokensSync as getDomaRankTokens };
export { getStandardTokensSync as getStandardTokens };
