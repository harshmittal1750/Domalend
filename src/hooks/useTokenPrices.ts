import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { TokenInfo, getTokenByAddress } from "@/config/tokens";
import {
  toBaseUnit,
  fromBaseUnit,
  // formatTokenAmount,
  formatUSDValue,
  BigIntMath,
  getTokenDisplayPrecision,
} from "@/lib/decimals";
import {
  DOMA_RANK_ORACLE_ABI,
  DOMA_RANK_ORACLE_ADDRESS,
} from "@/lib/contracts";

// DreamLend contract ABI for price-related functions
const DREAMLEND_ABI = [
  {
    inputs: [{ name: "loanId", type: "uint256" }],
    name: "getLoanHealthFactor",
    outputs: [
      { name: "currentRatio", type: "uint256" },
      { name: "priceStale", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "loanAsset", type: "address" },
      { name: "collateralAsset", type: "address" },
    ],
    name: "getRecommendedParameters",
    outputs: [
      { name: "minRatio", type: "uint256" },
      { name: "liquidationThreshold", type: "uint256" },
      { name: "maxStaleness", type: "uint256" },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { name: "loanAsset", type: "address" },
      { name: "collateralAsset", type: "address" },
    ],
    name: "isLoanPairSupported",
    outputs: [{ name: "supported", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Chainlink AggregatorV3Interface ABI
const AGGREGATOR_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface TokenPrice {
  address: string;
  symbol: string;
  priceUSD: string; // Human-readable price in USD (e.g., "2000.50")
  priceRaw: bigint; // Raw price from oracle in base units (normalized to 18 decimals)
  oracleDecimals: number; // Oracle decimals (from price feed)
  tokenDecimals: number; // Token decimals (from ERC20)
  updatedAt: number; // Timestamp
  isStale: boolean;
  // Doma-specific fields
  domaRankPrice?: string; // DomaRank oracle price (AI-adjusted)
  domaRankPriceRaw?: bigint; // DomaRank oracle price (raw)
  liveMarketPrice?: string; // Live market price from Doma Subgraph
  hasDomaRankOracle?: boolean; // Whether this token uses DomaRank oracle
}

export interface CollateralCalculation {
  // Base unit values (for internal calculations)
  minCollateralAmountRaw: bigint; // Minimum collateral in base units
  currentRatioRaw: bigint; // Current ratio in basis points (10000 = 100%)
  minRatioRaw: bigint; // Required minimum ratio in basis points
  liquidationThresholdRaw: bigint; // Liquidation threshold in basis points

  // Human-readable values (for display)
  minCollateralAmount: string; // Minimum collateral needed (formatted)
  currentRatio: string; // Current collateral ratio percentage
  minRatio: string; // Required minimum ratio percentage
  liquidationThreshold: string; // Liquidation threshold percentage
  isHealthy: boolean; // Whether current collateral is sufficient

  // Price information
  priceImpact: {
    loanTokenPriceUSD: string; // Human-readable USD price
    collateralTokenPriceUSD: string; // Human-readable USD price
    exchangeRate: string; // How much collateral per 1 loan token
    minCollateralValueUSD: string; // Minimum collateral value in USD
  };
}

const DREAMLEND_ADDRESS = "0xe268b4ff6Ced7330353eB26015a34fF78e06C8b3"; // DreamLend contract address

export function useTokenPrices(tokens: TokenInfo[]) {
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create stable token key for dependency tracking
  const tokenKeys = useMemo(
    () =>
      tokens
        .map((t) => `${t.address}-${t.priceFeedAddress}`)
        .sort()
        .join("|"),
    [tokens]
  );

  const fetchPrices = useCallback(async () => {
    if (tokens.length === 0) return;

   
    setIsLoading(true);
    setError(null);

    try {
      // Use Doma testnet RPC
      const provider = new ethers.JsonRpcProvider(
        "https://rpc-testnet.doma.xyz"
      );
      const newPrices = new Map<string, TokenPrice>();

      // Fetch Doma market prices from GraphQL for domain tokens
      const domaMarketPrices = new Map<string, number>();
      try {
        const domaResponse = await fetch(
          "https://api-testnet.doma.xyz/graphql",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "API-KEY": process.env.NEXT_PUBLIC_DOMA_API_KEY || "",
            },
            body: JSON.stringify({
              query: `query FractionalTokens {
                fractionalTokens {
                  items {
                    address
                    currentPrice
                    params {
                      decimals
                    }
                  }
                }
              }`,
            }),
          }
        );

        if (domaResponse.ok) {
          const domaData = await domaResponse.json();
          const items = domaData?.data?.fractionalTokens?.items || [];
          items.forEach((item: any) => {
            if (item.currentPrice && item.address) {
              // IMPORTANT: Doma currentPrice is ALWAYS in 8 decimals (not token decimals!)
              // Token decimals (6) are for token amounts, price is always 8 decimals
              const priceInUSD =
                parseFloat(item.currentPrice) / Math.pow(10, 8);
              const addressLower = item.address.toLowerCase();
              domaMarketPrices.set(addressLower, priceInUSD);
              console.log(
                `💰 Doma market: ${addressLower} = $${priceInUSD.toFixed(2)}`
              );
            }
          });
          console.log(
            "✅ Fetched Doma market prices:",
            domaMarketPrices.size,
            "tokens"
          );
        }
      } catch (error) {
        console.warn("Failed to fetch Doma market prices:", error);
      }

      // Fetch prices for all tokens in parallel
      const pricePromises = tokens.map(async (token) => {
        try {
          let priceRaw: bigint = 0n;
          let priceUSD: string = "0";
          let oracleDecimals: number = 18;
          let updatedAt: number = Math.floor(Date.now() / 1000);
          let isStale: boolean = false;

          // NOTE: Chainlink price feeds don't exist on Doma testnet
          // We use Doma GraphQL API for market prices instead

          // Check if we have a Doma market price for this token
          const domaMarketPrice = domaMarketPrices.get(
            token.address.toLowerCase()
          );

          if (domaMarketPrice) {
            // Use live market price from Doma
            priceUSD = domaMarketPrice.toFixed(4);
            priceRaw = ethers.parseUnits(priceUSD, 18);
          } else {
            // Default price for mock tokens (stablecoins = $1, others = $100)
            priceUSD = token.symbol.includes("USD") ? "1.00" : "100.00";
            priceRaw = ethers.parseUnits(priceUSD, 18);
          }

          // Check if DomaRank oracle has a price for this token
          let domaRankPrice: string | undefined;
          let domaRankPriceRaw: bigint | undefined;
          let hasDomaRankOracle = false;

          if (
            DOMA_RANK_ORACLE_ADDRESS &&
            DOMA_RANK_ORACLE_ADDRESS !==
              "0x0000000000000000000000000000000000000000"
          ) {
            try {
              console.log(
                `🔮 Fetching DomaRank price for ${token.symbol} from oracle at ${DOMA_RANK_ORACLE_ADDRESS}`
              );
              const domaOracle = new ethers.Contract(
                DOMA_RANK_ORACLE_ADDRESS,
                DOMA_RANK_ORACLE_ABI,
                provider
              );

              const oraclePrice = await domaOracle.getTokenValue(token.address);
              console.log(
                `🔮 Oracle returned: ${oraclePrice.toString()} Wei for ${token.symbol}`
              );

              if (oraclePrice && oraclePrice > 0n) {
                domaRankPriceRaw = oraclePrice;
                domaRankPrice = fromBaseUnit(oraclePrice, 18, 4);
                hasDomaRankOracle = true;
                console.log(
                  `✅ DomaRank price for ${token.symbol}: $${domaRankPrice}`
                );
              } else {
                console.log(`⊘ DomaRank price is 0 for ${token.symbol}`);
              }
            } catch (domaErr: any) {
              // DomaRank oracle might not have this token, that's okay
              console.log(
                `❌ No DomaRank price for ${token.symbol}:`,
                domaErr.message
              );
            }
          } else {
            console.log(
              `⚠️ DomaRank oracle address not configured (got: ${DOMA_RANK_ORACLE_ADDRESS})`
            );
          }

          return {
            token,
            tokenPrice: {
              address: token.address,
              symbol: token.symbol,
              // Use DomaRank oracle price as main price if available (more conservative for collateral)
              priceUSD:
                hasDomaRankOracle && domaRankPrice ? domaRankPrice : priceUSD,
              priceRaw:
                hasDomaRankOracle && domaRankPriceRaw
                  ? domaRankPriceRaw
                  : priceRaw,
              oracleDecimals,
              tokenDecimals: token.decimals,
              updatedAt: Number(updatedAt),
              isStale,
              domaRankPrice,
              domaRankPriceRaw,
              // liveMarketPrice is the actual market price from Doma GraphQL
              // priceUSD is either the market price or default mock price
              liveMarketPrice: domaMarketPrice
                ? domaMarketPrice.toFixed(4)
                : priceUSD,
              hasDomaRankOracle,
            },
          };
        } catch (err) {
          console.error(`Failed to fetch price for ${token.symbol}:`, err);
          return null;
        }
      });

      const results = await Promise.all(pricePromises);

      // Process results
      results.forEach((result) => {
        if (result) {
          const addressLower = result.token.address.toLowerCase();
          newPrices.set(addressLower, result.tokenPrice);
          console.log(
            `📦 Stored price for ${result.token.symbol} (${addressLower}): $${result.tokenPrice.priceUSD}`
          );
        }
      });

      console.log(`✅ Total prices stored: ${newPrices.size}`);
      setPrices(newPrices);
    } catch (err) {
      console.error("Failed to fetch token prices:", err);
      setError("Failed to fetch token prices");
    } finally {
      setIsLoading(false);
    }
  }, [tokenKeys]);

  // Debounced fetch prices on mount and when tokens change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPrices();
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [fetchPrices]);

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    if (tokens.length === 0) return;

    const interval = setInterval(() => {
      fetchPrices();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchPrices]);

  const refreshPrices = useCallback(() => {
    fetchPrices();
  }, [fetchPrices]);

  return {
    prices,
    isLoading,
    error,
    refreshPrices,
  };
}

export function useCollateralCalculation(
  loanToken?: TokenInfo,
  collateralToken?: TokenInfo,
  loanAmount?: string,
  collateralAmount?: string
) {
  const tokens = [loanToken, collateralToken].filter(Boolean) as TokenInfo[];
  const {
    prices,
    isLoading: pricesLoading,
    refreshPrices,
  } = useTokenPrices(tokens);

  const [calculation, setCalculation] = useState<CollateralCalculation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedParams, setRecommendedParams] = useState<
    [bigint, bigint, bigint] | null
  >(null);

  // Create stable key for token pair
  const tokenPairKey = useMemo(() => {
    if (!loanToken || !collateralToken) return "";
    return `${loanToken.address}-${collateralToken.address}`;
  }, [loanToken?.address, collateralToken?.address]);

  // Fetch recommended parameters from DreamLend contract
  useEffect(() => {
    const fetchRecommendedParams = async () => {
      if (!loanToken || !collateralToken) {
        setRecommendedParams(null);
        return;
      }

      try {
        // console.log('Fetching recommended parameters for:', loanToken.symbol, '->', collateralToken.symbol);
        const provider = new ethers.JsonRpcProvider(
          "https://rpc-testnet.doma.xyz"
        );
        const dreamLend = new ethers.Contract(
          DREAMLEND_ADDRESS,
          DREAMLEND_ABI,
          provider
        );

        const params = await dreamLend.getRecommendedParameters(
          loanToken.address,
          collateralToken.address
        );

        setRecommendedParams(params);
      } catch (error) {
        console.error("Failed to fetch recommended parameters:", error);
        setRecommendedParams(null);
      }
    };

    if (tokenPairKey) {
      const timeoutId = setTimeout(() => {
        fetchRecommendedParams();
      }, 100); // 100ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [tokenPairKey]);

  useEffect(() => {
    if (!loanToken || !collateralToken || !loanAmount || pricesLoading) {
      setCalculation(null);
      return;
    }

    const loanPrice = prices.get(loanToken.address);
    const collateralPrice = prices.get(collateralToken.address);

    if (!loanPrice || !collateralPrice || !recommendedParams) {
      return;
    }

    setIsLoading(true);

    try {
      const [minRatioRaw, liquidationThresholdRaw] = recommendedParams;

      // Convert user input to base units
      const loanAmountRaw = toBaseUnit(loanAmount, loanToken.decimals);

      // Calculate loan value in USD using BigInt math
      // loanAmountRaw (token base units) * priceRaw (18 decimals) / token scaling
      const loanValueUSD = BigIntMath.multiply(
        loanAmountRaw,
        loanPrice.priceRaw,
        loanToken.decimals,
        18, // Price is normalized to 18 decimals
        18 // Result in 18 decimals for USD value
      );

      // Calculate minimum collateral value needed (in USD, 18 decimals)
      const minCollateralValueUSD = BigIntMath.percentage(
        loanValueUSD,
        minRatioRaw,
        18
      );

      // Calculate minimum collateral amount needed in base units
      const minCollateralAmountRaw = BigIntMath.divide(
        minCollateralValueUSD,
        collateralPrice.priceRaw,
        18, // USD value decimals
        18, // Price decimals
        collateralToken.decimals // Result in collateral token decimals
      );

      // Format minimum collateral amount for display
      const minCollateralAmount = fromBaseUnit(
        minCollateralAmountRaw,
        collateralToken.decimals,
        getTokenDisplayPrecision(collateralToken.symbol)
      );

      // Calculate current ratio if collateral amount is provided
      let currentRatioRaw = 0n;
      let currentRatio = "0";
      let isHealthy = false;

      if (collateralAmount && parseFloat(collateralAmount) > 0) {
        const collateralAmountRaw = toBaseUnit(
          collateralAmount,
          collateralToken.decimals
        );

        // Calculate collateral value in USD
        const collateralValueUSD = BigIntMath.multiply(
          collateralAmountRaw,
          collateralPrice.priceRaw,
          collateralToken.decimals,
          18, // Price decimals
          18 // Result in 18 decimals
        );

        // Calculate ratio: (collateral value / loan value) in basis points
        currentRatioRaw = BigIntMath.ratio(
          collateralValueUSD,
          loanValueUSD,
          18, // Both values have 18 decimals
          18
        );

        currentRatio = fromBaseUnit(currentRatioRaw, 2, 2); // Convert from basis points to percentage
        isHealthy = currentRatioRaw >= minRatioRaw;
      }

      // Calculate exchange rate (how much collateral per 1 loan token)
      const exchangeRateRaw = BigIntMath.divide(
        loanPrice.priceRaw,
        collateralPrice.priceRaw,
        18, // Loan price decimals
        18, // Collateral price decimals
        collateralToken.decimals // Result in collateral token decimals
      );

      const exchangeRate = fromBaseUnit(
        exchangeRateRaw,
        collateralToken.decimals,
        getTokenDisplayPrecision(collateralToken.symbol)
      );

      // Format percentages for display
      const minRatio = fromBaseUnit(minRatioRaw, 2, 2); // Basis points to percentage
      const liquidationThreshold = fromBaseUnit(liquidationThresholdRaw, 2, 2);

      // Calculate minimum collateral value in USD for display
      const minCollateralValueUSDFormatted = formatUSDValue(
        minCollateralValueUSD,
        18,
        "1", // Already in USD
        2
      );

      setCalculation({
        // Base unit values (for internal calculations)
        minCollateralAmountRaw,
        currentRatioRaw,
        minRatioRaw,
        liquidationThresholdRaw,

        // Human-readable values (for display)
        minCollateralAmount,
        currentRatio,
        minRatio,
        liquidationThreshold,
        isHealthy,

        // Price information
        priceImpact: {
          loanTokenPriceUSD: loanPrice.priceUSD,
          collateralTokenPriceUSD: collateralPrice.priceUSD,
          exchangeRate,
          minCollateralValueUSD: minCollateralValueUSDFormatted,
        },
      });
    } catch (error) {
      console.error("Error calculating collateral:", error);
      setCalculation(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    loanToken,
    collateralToken,
    loanAmount,
    collateralAmount,
    prices,
    recommendedParams,
    pricesLoading,
  ]);

  return {
    calculation,
    isLoading: isLoading || pricesLoading,
    prices,
    refreshPrices,
  };
}
