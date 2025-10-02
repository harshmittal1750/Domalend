/**
 * @file useLivePriceComparison.ts
 * @description React hook for comparing historical loan prices with live oracle prices
 * @author DreamLend Team
 */

import React, { useState, useCallback, useMemo, useRef } from "react";
import { ProcessedLoan } from "./useSubgraphQuery";
import { getTokenByAddress, getPriceFeedAddress } from "@/config/tokens";
import { multicall, MulticallUtil, PriceData } from "@/lib/multicall";

// Enhanced loan data with price comparison
export interface LoanWithPriceComparison extends ProcessedLoan {
  // Current live prices
  currentTokenPrice?: PriceData;
  currentCollateralPrice?: PriceData;

  // Current USD values calculated with live prices
  currentLoanValueUSD: string;
  currentCollateralValueUSD: string;

  // Historical vs Current comparison
  loanTokenPriceChange: number; // % change from historical to current
  loanTokenPriceDirection: "up" | "down" | "unchanged";

  // Display values
  historicalLoanValueUSD: string; // From subgraph data
  priceChangeIndicator: {
    percentage: string;
    isPositive: boolean;
    isSignificant: boolean; // > 5% change
  };

  // Metadata
  pricesLastUpdated: number;
  hasPriceErrors: boolean;
  isStalePrice: boolean;
}

// Hook state interface
interface UseLivePriceComparisonState {
  loans: LoanWithPriceComparison[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  priceMap: Map<string, PriceData>;
}

// Hook options
interface UseLivePriceComparisonOptions {
  refreshInterval?: number; // Auto-refresh interval in ms (0 to disable)
  enableAutoRefresh?: boolean;
  stalePriceThreshold?: number; // Seconds after which price is considered stale
  significantChangeThreshold?: number; // Percentage threshold for significant price changes
}

/**
 * Custom React hook for comparing historical vs live prices for loans
 * Uses multicall to batch all price feed calls into a single RPC request
 */
export function useLivePriceComparison(
  loans: ProcessedLoan[],
  options: UseLivePriceComparisonOptions = {}
) {
  const {
    refreshInterval = 30000, // 30 seconds default
    enableAutoRefresh = true,
    stalePriceThreshold = 3600, // 1 hour
    significantChangeThreshold = 5, // 5%
  } = options;

  // State
  const [state, setState] = useState<UseLivePriceComparisonState>({
    loans: [],
    loading: false,
    error: null,
    lastUpdated: null,
    priceMap: new Map(),
  });

  // Ref to store the current timeout for cleanup
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to store current loans to avoid dependency issues
  const loansRef = useRef(loans);
  loansRef.current = loans;

  // Memoized unique tokens that need price fetching
  const uniquePriceFeeds = useMemo(() => {
    const tokenAddresses = new Set<string>();

    // Collect all unique token addresses from loans
    loans.forEach((loan) => {
      tokenAddresses.add(loan.tokenAddress.toLowerCase());
      tokenAddresses.add(loan.collateralAddress.toLowerCase());
    });

    // Map to price feed calls
    return MulticallUtil.getUniquePriceFeeds(
      Array.from(tokenAddresses),
      (tokenAddress: string) => {
        return getPriceFeedAddress(tokenAddress);
      }
    );
  }, [loans.map((l) => `${l.tokenAddress}-${l.collateralAddress}`).join(",")]);

  /**
   * Calculate price change percentage and direction
   */
  const calculatePriceChange = useCallback(
    (historicalPriceUSD: string, currentPriceUSD: string) => {
      const historical = parseFloat(historicalPriceUSD);
      const current = parseFloat(currentPriceUSD);

      if (historical <= 0 || current <= 0) {
        return {
          percentage: 0,
          direction: "unchanged" as const,
          isSignificant: false,
        };
      }

      const changePercent = ((current - historical) / historical) * 100;

      return {
        percentage: changePercent,
        direction:
          changePercent > 0.1
            ? ("up" as const)
            : changePercent < -0.1
              ? ("down" as const)
              : ("unchanged" as const),
        isSignificant: Math.abs(changePercent) >= significantChangeThreshold,
      };
    },
    [significantChangeThreshold]
  );

  /**
   * Main function to fetch current prices and compare with historical data
   */
  const fetchLivePrices = useCallback(async () => {
    if (uniquePriceFeeds.length === 0) {
      setState((prev) => ({
        ...prev,
        loans: loansRef.current.map((loan) => ({
          ...loan,
          currentLoanValueUSD: "0.00",
          currentCollateralValueUSD: "0.00",
          loanTokenPriceChange: 0,
          loanTokenPriceDirection: "unchanged" as const,
          historicalLoanValueUSD: loan.historicalAmountUSD || "0.00",
          priceChangeIndicator: {
            percentage: "0.00%",
            isPositive: false,
            isSignificant: false,
          },
          pricesLastUpdated: Date.now(),
          hasPriceErrors: true,
          isStalePrice: true,
        })),
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch all prices in a single multicall
      const priceDataList =
        await multicall.batchFetchPriceFeeds(uniquePriceFeeds);
      const priceMap = MulticallUtil.createPriceMap(priceDataList);

      // Process loans with current price data and historical comparison
      const enhancedLoans: LoanWithPriceComparison[] = loansRef.current.map(
        (loan) => {
          const currentTokenPrice = priceMap.get(
            loan.tokenAddress.toLowerCase()
          );
          const currentCollateralPrice = priceMap.get(
            loan.collateralAddress.toLowerCase()
          );

          // Get token info for decimals
          const loanTokenInfo = getTokenByAddress(loan.tokenAddress);
          const collateralTokenInfo = getTokenByAddress(loan.collateralAddress);

          let currentLoanValueUSD = "0.00";
          let currentCollateralValueUSD = "0.00";
          let loanTokenPriceChange = 0;
          let loanTokenPriceDirection: "up" | "down" | "unchanged" =
            "unchanged";
          let priceChangeIndicator = {
            percentage: "0.00%",
            isPositive: false,
            isSignificant: false,
          };

          if (currentTokenPrice && loanTokenInfo) {
            // Calculate current USD value of loan amount
            currentLoanValueUSD = MulticallUtil.calculateUSDValue(
              loan.amount,
              loanTokenInfo.decimals,
              currentTokenPrice
            );

            // Compare with historical price if available
            if (loan.historicalPriceUSD) {
              const priceChange = calculatePriceChange(
                loan.historicalPriceUSD,
                currentTokenPrice.priceUSD
              );

              loanTokenPriceChange = priceChange.percentage;
              loanTokenPriceDirection = priceChange.direction;

              priceChangeIndicator = {
                percentage: `${priceChange.percentage >= 0 ? "+" : ""}${priceChange.percentage.toFixed(2)}%`,
                isPositive: priceChange.percentage > 0,
                isSignificant: priceChange.isSignificant,
              };
            }
          }

          if (currentCollateralPrice && collateralTokenInfo) {
            // Calculate current USD value of collateral amount
            currentCollateralValueUSD = MulticallUtil.calculateUSDValue(
              loan.collateralAmount,
              collateralTokenInfo.decimals,
              currentCollateralPrice
            );
          }

          const hasPriceErrors =
            !currentTokenPrice?.success || !currentCollateralPrice?.success;
          const isStalePrice =
            currentTokenPrice?.isStale ||
            currentCollateralPrice?.isStale ||
            false;

          return {
            ...loan,
            currentTokenPrice,
            currentCollateralPrice,
            currentLoanValueUSD,
            currentCollateralValueUSD,
            loanTokenPriceChange,
            loanTokenPriceDirection,
            historicalLoanValueUSD: loan.historicalAmountUSD || "0.00",
            priceChangeIndicator,
            pricesLastUpdated: Date.now(),
            hasPriceErrors,
            isStalePrice,
          };
        }
      );

      setState({
        loans: enhancedLoans,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        priceMap,
      });

      // Setup auto-refresh if enabled
      if (enableAutoRefresh && refreshInterval > 0) {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          fetchLivePrices();
        }, refreshInterval);
      }
    } catch (error) {
      console.error("Failed to fetch live prices:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }));
    }
  }, [
    uniquePriceFeeds,
    calculatePriceChange,
    enableAutoRefresh,
    refreshInterval,
  ]);

  /**
   * Manual refresh function
   */
  const refreshPrices = useCallback(() => {
    fetchLivePrices();
  }, [fetchLivePrices]);

  /**
   * Get price data for a specific token
   */
  const getPriceForToken = useCallback(
    (tokenAddress: string): PriceData | undefined => {
      return state.priceMap.get(tokenAddress.toLowerCase());
    },
    [state.priceMap]
  );

  /**
   * Get statistics about price changes
   */
  const getPriceChangeStats = useMemo(() => {
    const stats = {
      totalLoans: state.loans.length,
      pricesUp: 0,
      pricesDown: 0,
      pricesUnchanged: 0,
      significantChanges: 0,
      averageChange: 0,
    };

    if (state.loans.length === 0) return stats;

    let totalChange = 0;

    state.loans.forEach((loan) => {
      switch (loan.loanTokenPriceDirection) {
        case "up":
          stats.pricesUp++;
          break;
        case "down":
          stats.pricesDown++;
          break;
        default:
          stats.pricesUnchanged++;
      }

      if (loan.priceChangeIndicator.isSignificant) {
        stats.significantChanges++;
      }

      totalChange += loan.loanTokenPriceChange;
    });

    stats.averageChange = totalChange / state.loans.length;

    return stats;
  }, [state.loans]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Initial fetch when loans change
  React.useEffect(() => {
    if (loansRef.current.length > 0) {
      fetchLivePrices();
    }
  }, [fetchLivePrices, loans.length]);

  return {
    // Enhanced loan data with price comparison
    loans: state.loans,

    // State
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Utility functions
    refreshPrices,
    getPriceForToken,

    // Statistics
    priceChangeStats: getPriceChangeStats,

    // Raw price data
    priceMap: state.priceMap,
  };
}
