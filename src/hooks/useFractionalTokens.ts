import { useState, useEffect } from "react";
import { FractionalTokensResponse, FractionalToken } from "@/lib/graphql/types";
import { FRACTIONAL_TOKENS_QUERY } from "@/lib/graphql/queries";
import { TokenInfo } from "@/config/tokens";

const GRAPHQL_ENDPOINT = "https://api-testnet.doma.xyz/graphql";

// Tokens that have oracle support (addresses that are already configured)
const ORACLE_SUPPORTED_ADDRESSES = [
  "0xf2dDd2022611cCddFC088d87D355bEEC15B30d7D".toLowerCase(), // SOFTWAREAI
  "0xBA1Ac5CF547d1C2bdaE9aAaa588D7f081219Bc62".toLowerCase(), // SEEYOUATKBW
  "0xAf56AB93BD19a94136a808Ab3CcD8B61BFa99119".toLowerCase(), // LABUBURIP
  "0x2121B21659C60Eadf39a27Fb7B9a8Ec23b215526".toLowerCase(), // ILOVEPUMPKINSPICE
  "0xF547543382fe62C6Da7bB862a0765b95E0269661".toLowerCase(), // DRINKMIZU
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

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: FractionalTokensResponse = await response.json();
        const fractionalTokens = result.data.fractionalTokens.items;

        // Convert GraphQL tokens to TokenInfo format
        const convertedTokens: TokenInfo[] = fractionalTokens.map((token) =>
          convertToTokenInfo(token)
        );

        setTokens(convertedTokens);
      } catch (err) {
        console.error("Error fetching fractional tokens:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, []);

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
