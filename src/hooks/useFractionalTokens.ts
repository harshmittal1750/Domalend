import { useState, useEffect } from "react";
import { FractionalTokensResponse, FractionalToken } from "@/lib/graphql/types";
import { FRACTIONAL_TOKENS_QUERY } from "@/lib/graphql/queries";
import { TokenInfo } from "@/config/tokens";

const GRAPHQL_ENDPOINT = "https://api-testnet.doma.xyz/graphql";

// Tokens that have oracle support (addresses that are already configured)
const ORACLE_SUPPORTED_ADDRESSES = [
  "0x46540A006c5a4339DDda114814BA18bDB00243Dc".toLowerCase(), // SOFTWAREAI
  "0xf0EDc7c1Ef6165D7Ec0B663D6d423B244AD21c14".toLowerCase(), // SEEYOUATKBW
  "0x81Cad3b1Bab1C89F3a32a8E41bF1C569bC0B6b3C".toLowerCase(), // LABUBURIP
  "0x2121B21659C60Eadf39a27Fb7B9a8Ec23b215526".toLowerCase(), // ILOVEPUMPKINSPICE
  "0xb21c8F6A02665c4EE3e9a89afdB62529Cc7cdc57".toLowerCase(), // DRINKMIZU
  "0xDcA22072a8a2470A55076857f13212e635a4b41b".toLowerCase(), // FRACTIONALIZED DOMAIN
  "0xCF06f051a7E2877a5A0A098B67511075d0a1a98B".toLowerCase(), // ARTHURSFERRARI.com
];

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

        // Convert GraphQL tokens to TokenInfo format
        const convertedTokens: TokenInfo[] = fractionalTokens.map((token) =>
          convertToTokenInfo(token)
        );

        console.log("✅ Converted tokens:", convertedTokens.length);
        console.log(
          "🎯 Tokens with oracle support:",
          convertedTokens.filter((t) => t.hasDomaRankOracle).length
        );

        setTokens(convertedTokens);
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
function convertToTokenInfo(token: FractionalToken): TokenInfo {
  const hasOracleSupport = ORACLE_SUPPORTED_ADDRESSES.includes(
    token.address.toLowerCase()
  );

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
