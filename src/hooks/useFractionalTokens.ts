import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { FractionalTokensResponse, FractionalToken } from "@/lib/graphql/types";
import { FRACTIONAL_TOKENS_QUERY } from "@/lib/graphql/queries";
import { TokenInfo } from "@/config/tokens";
import {
  DOMA_RANK_ORACLE_ABI,
  DOMA_RANK_ORACLE_ADDRESS,
} from "@/lib/contracts";

const GRAPHQL_ENDPOINT = "https://api-testnet.doma.xyz/graphql";

/**
 * Check if a token has oracle price support by querying the oracle contract
 */
async function checkOracleSupport(tokenAddress: string): Promise<boolean> {
  // If oracle is not configured, return false
  if (
    !DOMA_RANK_ORACLE_ADDRESS ||
    DOMA_RANK_ORACLE_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return false;
  }

  try {
    const provider = new ethers.JsonRpcProvider("https://rpc-testnet.doma.xyz");
    const oracleContract = new ethers.Contract(
      DOMA_RANK_ORACLE_ADDRESS,
      DOMA_RANK_ORACLE_ABI,
      provider
    );

    // Try to get the token price
    const price = await oracleContract.getTokenValue(tokenAddress);

    // Oracle has price support if price is greater than 0
    const hasSupport = price > 0n;

    if (hasSupport) {
      console.log(
        `✅ Oracle support confirmed for ${tokenAddress}: $${ethers.formatUnits(price, 18)}`
      );
    } else {
      console.log(`⚠️ Oracle returns 0 for ${tokenAddress}`);
    }

    return hasSupport;
  } catch (error: any) {
    // If the contract call fails (e.g., "Token price not set"), no oracle support
    console.log(`⚠️ No oracle support for ${tokenAddress}:`, error.message);
    return false;
  }
}

export function useFractionalTokens() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_KEY = process.env.NEXT_PUBLIC_DOMA_API_KEY;

  useEffect(() => {
    async function fetchTokens() {
      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Fetching fractional tokens from Doma API...");
        console.log("📍 Endpoint:", GRAPHQL_ENDPOINT);
        console.log("🔑 API Key present:", !!API_KEY);
        console.log("🔑 API Key length:", API_KEY?.length || 0);

        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "API-KEY": API_KEY || "",
          },
          body: JSON.stringify({
            query: FRACTIONAL_TOKENS_QUERY,
          }),
        });

        console.log("📡 Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Response not OK:", errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: FractionalTokensResponse = await response.json();
        console.log("📦 Raw API response:", result);

        // Check for GraphQL errors
        if (result.errors && result.errors.length > 0) {
          console.error("❌ GraphQL errors:", result.errors);
          throw new Error(result.errors[0].message);
        }

        if (!result.data || !result.data.fractionalTokens) {
          console.error("❌ No data in response:", result);
          throw new Error("No fractional tokens data in response");
        }

        const fractionalTokens = result.data.fractionalTokens.items;
        console.log("✅ Found fractional tokens:", fractionalTokens.length);

        // Convert GraphQL tokens to TokenInfo format (without oracle check yet)
        const convertedTokens: TokenInfo[] = fractionalTokens.map(
          (token) => convertToTokenInfo(token, false) // Don't set oracle support yet
        );

        console.log("✅ Converted tokens:", convertedTokens.length);

        // Check oracle support for all tokens in parallel
        console.log("🔮 Checking oracle support for all tokens...");
        const oracleSupportPromises = convertedTokens.map(async (token) => {
          const hasSupport = await checkOracleSupport(token.address);
          return { ...token, hasDomaRankOracle: hasSupport };
        });

        const tokensWithOracleStatus = await Promise.all(oracleSupportPromises);

        console.log("✅ Oracle support check complete!");
        console.log(
          "🎯 Tokens with oracle support:",
          tokensWithOracleStatus.filter((t) => t.hasDomaRankOracle).length
        );

        setTokens(tokensWithOracleStatus);
      } catch (err) {
        console.error("❌ Error fetching fractional tokens:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, [API_KEY]);

  return { tokens, loading, error };
}

// Convert GraphQL FractionalToken to TokenInfo
function convertToTokenInfo(
  token: FractionalToken,
  hasOracleSupport: boolean = false
): TokenInfo {
  return {
    address: token.address,
    name: token.params.name || token.name,
    symbol: token.params.symbol,
    decimals: token.params.decimals,
    description:
      token.metadata?.description ||
      token.metadata?.title ||
      `Fractional ownership of ${token.params.name}`,
    category: "domain",
    volatilityTier: "high",
    priceFeedAddress: "0x0000000000000000000000000000000000000000",
    hasDomaRankOracle: hasOracleSupport,
    isDomainToken: true,
    domainMetadata: {
      image: token.metadata?.image,
      website: token.metadata?.primaryWebsite,
      twitterLink: token.metadata?.xLink,
    },
  };
}

// Get only tokens with oracle support
export function useOracleSupportedTokens() {
  const { tokens, loading, error } = useFractionalTokens();

  const oracleSupportedTokens = tokens.filter(
    (token) => token.hasDomaRankOracle === true
  );

  return {
    tokens: oracleSupportedTokens,
    loading,
    error,
  };
}

// Get all tokens with oracle status
export function useAllDomainTokens() {
  const { tokens, loading, error } = useFractionalTokens();

  // Sort: oracle-supported tokens first
  const sortedTokens = [...tokens].sort((a, b) => {
    if (a.hasDomaRankOracle && !b.hasDomaRankOracle) return -1;
    if (!a.hasDomaRankOracle && b.hasDomaRankOracle) return 1;
    return 0;
  });

  return {
    tokens: sortedTokens,
    oracleSupportedTokens: tokens.filter((t) => t.hasDomaRankOracle),
    comingSoonTokens: tokens.filter((t) => !t.hasDomaRankOracle),
    loading,
    error,
  };
}
