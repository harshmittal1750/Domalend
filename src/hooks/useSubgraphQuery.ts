import { useState, useEffect, useCallback } from "react";
import React from "react";

// =================================================================
// 1. Type Definitions for Subgraph Entities
// =================================================================
// These types should match the schema of your subgraph entities.

export interface LoanCreatedEvent {
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  collateralAddress: string;
  collateralAmount: string;
  duration: string;
  id: string;
  interestRate: string;
  lender: string;
  liquidationThresholdBPS: string;
  loanId: string;
  maxPriceStaleness: string;
  minCollateralRatioBPS: string;
  tokenAddress: string;
  transactionHash: string;
  // Historical price data from when loan was created
  priceUSD: string; // Price of loan token at creation time
  amountUSD: string; // USD value of loan amount at creation time
}

export interface LoanAcceptedEvent {
  id: string;
  loanId: string;
  borrower: string;
  timestamp: string;
  initialCollateralRatio: string;
}

export interface LoanRepaidEvent {
  id: string;
  loanId: string;
  borrower: string;
  repaymentAmount: string;
  timestamp: string;
}

export interface LoanLiquidatedEvent {
  id: string;
  loanId: string;
  liquidator: string;
  collateralClaimedByLender: string;
  liquidatorReward: string;
  timestamp: string;
}

export interface LoanOfferCancelledEvent {
  id: string;
  loanId: string;
  lender: string;
  timestamp: string;
}

export interface LoanOfferRemovedEvent {
  id: string;
  loanId: string;
  reason: string;
}

export interface OwnershipTransferredEvent {
  id: string;
  previousOwner: string;
  newOwner: string;
}

export interface PriceFeedSetEvent {
  id: string;
  tokenAddress: string;
  feedAddress: string;
}

// =================================================================
// 2. Generic Fetch Hook (The Engine)
// =================================================================
// This generic hook handles the actual fetching logic for any query.

interface UseSubgraphQueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE_DURATION = 2 * 60 * 1000; // 2 minutes

export function useSubgraphQuery<T>(
  query: string,
  options: { cacheKey?: string; cacheDuration?: number } = {}
): UseSubgraphQueryState<T> {
  const { cacheKey = query, cacheDuration = CACHE_DURATION } = options;

  const [state, setState] = useState<UseSubgraphQueryState<T>>(() => {
    // Check cache on initial render
    const cached = queryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        data: cached.data,
        loading: false,
        error: null,
      };
    }
    return {
      data: cached?.data || null, // Use stale data if available
      loading: true,
      error: null,
    };
  });

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const apiUrl = `${window.location.origin}/api/subgraph`;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Network response was not ok");
        }

        const result = await response.json();
        if (result.errors) {
          throw new Error(
            result.errors.map((e: Error) => e.message).join("\n")
          );
        }

        // Update cache
        const now = Date.now();
        queryCache.set(cacheKey, {
          data: result.data,
          timestamp: now,
          expiresAt: now + cacheDuration,
        });

        setState({ data: result.data, loading: false, error: null });
      } catch (err: unknown) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
        console.error("Failed to fetch from subgraph proxy:", err);
      }
    },
    [query, cacheKey, cacheDuration]
  );

  useEffect(() => {
    if (!query) return;

    const cached = queryCache.get(cacheKey);
    const now = Date.now();

    if (cached) {
      if (cached.expiresAt > now) {
        // Cache is fresh, use it
        setState({ data: cached.data, loading: false, error: null });
        return;
      } else if (
        cached.timestamp + cacheDuration + STALE_WHILE_REVALIDATE_DURATION >
        now
      ) {
        // Cache is stale but within stale-while-revalidate window
        setState({ data: cached.data, loading: false, error: null });
        // Fetch in background
        fetchData(true);
        return;
      }
    }

    // No cache or cache is too old, fetch normally
    fetchData(false);
  }, [query, cacheKey, fetchData]);

  return state;
}

// Function to invalidate cache entries
export function invalidateSubgraphCache(pattern?: string) {
  if (pattern) {
    // Invalidate entries matching pattern
    for (const [key] of queryCache) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    queryCache.clear();
  }
}

// Function to manually refresh a specific query
export function refreshSubgraphQuery(cacheKey: string) {
  queryCache.delete(cacheKey);
}

// =================================================================
// 3. Specific Hooks for Each Event (The API for your components)
// =================================================================
// These hooks are what your components will actually use. They provide
// the correct query and type to the generic hook.

const defaultQueryOptions = `(first: 100, orderBy: blockTimestamp, orderDirection: desc)`;

// Hook to get LoanCreated events
export const useLoanCreatedEvents = () => {
  const query = `query GetLoanCreateds {
    loanCreateds${defaultQueryOptions} {
      amount
      blockNumber
      blockTimestamp
      collateralAddress
      collateralAmount
      duration
      id
      interestRate
      lender
      liquidationThresholdBPS
      loanId
      maxPriceStaleness
      minCollateralRatioBPS
      tokenAddress
      transactionHash
      priceUSD
      amountUSD
    }
  }`;
  return useSubgraphQuery<{ loanCreateds: LoanCreatedEvent[] }>(query, {
    cacheKey: "loanCreatedEvents",
    cacheDuration: 3 * 60 * 1000, // 3 minutes for loan events
  });
};

export interface ProtocolStatsCollection {
  totalLoansCreated: string;
  totalLoanVolumeUSD: string;
  totalLoanVolume: string;
  id: string;
}

export const useProtocolStatsCollection = () => {
  const query = `query protocolStatsCollection{
  protocolStats_collection {
    totalLoansCreated
    totalLoanVolumeUSD
    totalLoanVolume
    id
  }
  
}`;
  return useSubgraphQuery<{
    protocolStats_collection: ProtocolStatsCollection[];
  }>(query);
};
// Hook to get LoanAccepted events
export const useLoanAcceptedEvents = () => {
  const query = `{
    loanAccepteds${defaultQueryOptions} { id loanId borrower timestamp initialCollateralRatio }
  }`;
  return useSubgraphQuery<{ loanAccepteds: LoanAcceptedEvent[] }>(query, {
    cacheKey: "loanAcceptedEvents",
    cacheDuration: 3 * 60 * 1000,
  });
};

// Hook to get LoanRepaid events
export const useLoanRepaidEvents = () => {
  const query = `{
      loanRepaids${defaultQueryOptions} { id loanId borrower repaymentAmount timestamp }
    }`;
  return useSubgraphQuery<{ loanRepaids: LoanRepaidEvent[] }>(query, {
    cacheKey: "loanRepaidEvents",
    cacheDuration: 3 * 60 * 1000,
  });
};

// Hook to get LoanLiquidated events
export const useLoanLiquidatedEvents = () => {
  const query = `{
      loanLiquidateds${defaultQueryOptions} { id loanId liquidator collateralClaimedByLender liquidatorReward timestamp }
    }`;
  return useSubgraphQuery<{ loanLiquidateds: LoanLiquidatedEvent[] }>(query, {
    cacheKey: "loanLiquidatedEvents",
    cacheDuration: 3 * 60 * 1000,
  });
};

// Hook to get LoanOfferCancelled events
export const useLoanOfferCancelledEvents = () => {
  const query = `{
    loanOfferCancelleds${defaultQueryOptions} { id loanId lender timestamp }
  }`;
  return useSubgraphQuery<{ loanOfferCancelleds: LoanOfferCancelledEvent[] }>(
    query,
    {
      cacheKey: "loanOfferCancelledEvents",
      cacheDuration: 3 * 60 * 1000,
    }
  );
};

// Hook to get LoanOfferRemoved events
export const useLoanOfferRemovedEvents = () => {
  const query = `{
    loanOfferRemoveds${defaultQueryOptions} { id loanId reason }
  }`;
  return useSubgraphQuery<{ loanOfferRemoveds: LoanOfferRemovedEvent[] }>(
    query,
    {
      cacheKey: "loanOfferRemovedEvents",
      cacheDuration: 3 * 60 * 1000,
    }
  );
};

// =================================================================
// 4. Utility Functions for Processing Loan Data
// =================================================================

// Convert subgraph loan data to our Loan interface
export interface ProcessedLoan {
  id: bigint;
  lender: string;
  borrower: string;
  tokenAddress: string;
  amount: bigint;
  interestRate: bigint;
  duration: bigint;
  collateralAddress: string;
  collateralAmount: bigint;
  startTime: bigint;
  createdAt: bigint; // When the loan was created
  status: number; // 0=Pending, 1=Active, 2=Repaid, 3=Defaulted, 4=Cancelled
  // Historical price data from loan creation
  historicalPriceUSD?: string; // Price of loan token when created
  historicalAmountUSD?: string; // USD value of loan amount when created
  // New fields for enhanced loan management
  minCollateralRatioBPS: bigint;
  liquidationThresholdBPS: bigint;
  maxPriceStaleness: bigint;
  repaidAmount: bigint;
}

// Determine loan status based on events
export const determineLoanStatus = (
  loanId: string,
  acceptedEvents: LoanAcceptedEvent[],
  repaidEvents: LoanRepaidEvent[],
  liquidatedEvents: LoanLiquidatedEvent[],
  cancelledEvents: LoanOfferCancelledEvent[],
  removedEvents: LoanOfferRemovedEvent[]
): number => {
  // Check if repaid first (final state)
  if (repaidEvents.some((e) => e.loanId === loanId)) return 2; // Repaid

  // Check if liquidated (final state)
  if (liquidatedEvents.some((e) => e.loanId === loanId)) return 3; // Defaulted

  // Check if accepted (active state)
  if (acceptedEvents.some((e) => e.loanId === loanId)) return 1; // Active

  // Check if explicitly cancelled by lender
  if (cancelledEvents.some((e) => e.loanId === loanId)) return 4; // Cancelled

  // LoanOfferRemoved can happen for both accepted and cancelled loans
  // Only treat as cancelled if there's no accepted event
  if (removedEvents.some((e) => e.loanId === loanId)) {
    // If there was no accepted event, it was likely cancelled
    return 4; // Cancelled
  }

  // Otherwise it's pending
  return 0; // Pending
};

// Process loan created events into our loan format
export const processLoansFromSubgraph = (
  loanCreatedEvents: LoanCreatedEvent[],
  acceptedEvents: LoanAcceptedEvent[],
  repaidEvents: LoanRepaidEvent[],
  liquidatedEvents: LoanLiquidatedEvent[],
  cancelledEvents: LoanOfferCancelledEvent[],
  removedEvents: LoanOfferRemovedEvent[]
): ProcessedLoan[] => {
  return loanCreatedEvents.map((loan) => {
    const status = determineLoanStatus(
      loan.loanId,
      acceptedEvents,
      repaidEvents,
      liquidatedEvents,
      cancelledEvents,
      removedEvents
    );

    // Find borrower from accepted events
    const acceptedEvent = acceptedEvents.find((e) => e.loanId === loan.loanId);
    const borrower =
      acceptedEvent?.borrower || "0x0000000000000000000000000000000000000000";

    // Find start time from accepted events
    const startTime = acceptedEvent?.timestamp || "0";

    return {
      id: BigInt(loan.loanId),
      lender: loan.lender,
      borrower,
      tokenAddress: loan.tokenAddress,
      amount: BigInt(loan.amount),
      interestRate: BigInt(loan.interestRate),
      duration: BigInt(loan.duration),
      collateralAddress: loan.collateralAddress,
      collateralAmount: BigInt(loan.collateralAmount),
      startTime: BigInt(startTime),
      createdAt: BigInt(loan.blockTimestamp),
      status,
      // Include historical price data
      historicalPriceUSD: loan.priceUSD,
      historicalAmountUSD: loan.amountUSD,
      // Add new fields with defaults (subgraph may not have these yet)
      minCollateralRatioBPS: BigInt(loan.minCollateralRatioBPS || "15000"),
      liquidationThresholdBPS: BigInt(loan.liquidationThresholdBPS || "12000"),
      maxPriceStaleness: BigInt(loan.maxPriceStaleness || "3600"),
      repaidAmount: BigInt("0"), // Will be updated from repayment events later
    };
  });
};

// Hook to get all loan data with computed status
export const useAllLoansWithStatus = () => {
  const {
    data: loanCreatedData,
    loading: loadingCreated,
    error: errorCreated,
  } = useLoanCreatedEvents();
  const {
    data: loanAcceptedData,
    loading: loadingAccepted,
    error: errorAccepted,
  } = useLoanAcceptedEvents();
  const {
    data: loanRepaidData,
    loading: loadingRepaid,
    error: errorRepaid,
  } = useLoanRepaidEvents();
  const {
    data: loanLiquidatedData,
    loading: loadingLiquidated,
    error: errorLiquidated,
  } = useLoanLiquidatedEvents();
  const {
    data: loanCancelledData,
    loading: loadingCancelled,
    error: errorCancelled,
  } = useLoanOfferCancelledEvents();
  const {
    data: loanRemovedData,
    loading: loadingRemoved,
    error: errorRemoved,
  } = useLoanOfferRemovedEvents();

  const loading =
    loadingCreated ||
    loadingAccepted ||
    loadingRepaid ||
    loadingLiquidated ||
    loadingCancelled ||
    loadingRemoved;
  const error =
    errorCreated ||
    errorAccepted ||
    errorRepaid ||
    errorLiquidated ||
    errorCancelled ||
    errorRemoved;

  const processedLoans = React.useMemo(() => {
    if (!loanCreatedData?.loanCreateds) return [];

    return processLoansFromSubgraph(
      loanCreatedData.loanCreateds,
      loanAcceptedData?.loanAccepteds || [],
      loanRepaidData?.loanRepaids || [],
      loanLiquidatedData?.loanLiquidateds || [],
      loanCancelledData?.loanOfferCancelleds || [],
      loanRemovedData?.loanOfferRemoveds || []
    );
  }, [
    loanCreatedData,
    loanAcceptedData,
    loanRepaidData,
    loanLiquidatedData,
    loanCancelledData,
    loanRemovedData,
  ]);

  return {
    loans: processedLoans,
    loading,
    error,
  };
};
