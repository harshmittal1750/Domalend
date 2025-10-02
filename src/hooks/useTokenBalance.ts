import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { SOMNIA_TESTNET_CONFIG } from "@/lib/contracts";

interface TokenBalance {
  balance: string;
  formattedBalance: string;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

interface UseTokenBalanceOptions {
  refreshInterval?: number; // in milliseconds, default 30 seconds
  enableAutoRefresh?: boolean;
}

export const useTokenBalance = (
  tokenAddress: string | null,
  userAddress: string | null,
  decimals: number = 18,
  options: UseTokenBalanceOptions = {}
) => {
  const { refreshInterval = 30000, enableAutoRefresh = true } = options;

  const [balanceData, setBalanceData] = useState<TokenBalance>({
    balance: "0",
    formattedBalance: "0.0000",
    isLoading: false,
    error: null,
    lastUpdated: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMounted = useRef(true);

  // Reset mounted state on each render to ensure it's always true when component is active
  isComponentMounted.current = true;

  const fetchBalance = useCallback(async () => {
    if (!tokenAddress || !userAddress || !isComponentMounted.current) {
      console.log(
        `[useTokenBalance] Skipping fetch - tokenAddress: ${tokenAddress}, userAddress: ${userAddress}, mounted: ${isComponentMounted.current}`
      );
      setBalanceData((prev) => ({
        ...prev,
        balance: "0",
        formattedBalance: "0.0000",
        isLoading: false,
        error: null,
      }));
      return;
    }

    console.log(
      `[useTokenBalance] Fetching balance for token: ${tokenAddress}, user: ${userAddress}`
    );
    setBalanceData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const provider = new ethers.JsonRpcProvider(
        SOMNIA_TESTNET_CONFIG.rpcUrls.default.http[0]
      );

      // Test provider connection
      console.log(`[useTokenBalance] Testing provider connection...`);
      const network = await provider.getNetwork();
      console.log(
        `[useTokenBalance] Connected to network:`,
        network.chainId.toString()
      );

      let balance: bigint;

      // Check if it's native token (ETH)
      if (
        tokenAddress.toLowerCase() ===
          "0x0000000000000000000000000000000000000000" ||
        tokenAddress.toLowerCase() ===
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      ) {
        console.log(
          `[useTokenBalance] Fetching native token balance for ${userAddress}`
        );
        balance = await provider.getBalance(userAddress);
      } else {
        // ERC20 token
        console.log(
          `[useTokenBalance] Fetching ERC20 token balance for contract ${tokenAddress}, user ${userAddress}`
        );
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
          ],
          provider
        );

        // Test if contract exists
        try {
          const code = await provider.getCode(tokenAddress);
          console.log(`[useTokenBalance] Contract code length:`, code.length);
          if (code === "0x") {
            throw new Error("Contract not found at address");
          }
        } catch (codeError) {
          console.error(
            `[useTokenBalance] Contract verification failed:`,
            codeError
          );
        }

        balance = await tokenContract.balanceOf(userAddress);
      }

      const formattedBalance = ethers.formatUnits(balance, decimals);
      const displayBalance = parseFloat(formattedBalance).toFixed(4);

      console.log(
        `[useTokenBalance] Balance fetched: ${balance.toString()} (${displayBalance}) with ${decimals} decimals`
      );

      if (isComponentMounted.current) {
        setBalanceData({
          balance: balance.toString(),
          formattedBalance: displayBalance,
          isLoading: false,
          error: null,
          lastUpdated: Date.now(),
        });
      }
    } catch (error) {
      console.error(
        `[useTokenBalance] Failed to fetch balance for ${tokenAddress}:`,
        error
      );
      if (isComponentMounted.current) {
        setBalanceData((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch balance",
        }));
      }
    }
  }, [tokenAddress, userAddress, decimals]);

  // Manual refresh function
  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Setup interval for auto-refresh (separate from immediate fetch)
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up auto-refresh if enabled (don't fetch immediately here to avoid duplicate calls)
    if (
      enableAutoRefresh &&
      refreshInterval > 0 &&
      tokenAddress &&
      userAddress
    ) {
      intervalRef.current = setInterval(fetchBalance, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    tokenAddress,
    userAddress,
    decimals,
    enableAutoRefresh,
    refreshInterval,
    fetchBalance,
  ]);

  // Immediate fetch when token or user address changes
  useEffect(() => {
    console.log(
      `[useTokenBalance] Token or address changed - token: ${tokenAddress}, user: ${userAddress}`
    );

    // Reset balance state immediately when token changes to prevent showing stale data
    setBalanceData({
      balance: "0",
      formattedBalance: "0.0000",
      isLoading: !!tokenAddress && !!userAddress, // Only show loading if we have both token and user
      error: null,
      lastUpdated: 0,
    });

    if (tokenAddress && userAddress) {
      // Fetch immediately without delay to prevent stale data display
      fetchBalance();
    }
  }, [tokenAddress, userAddress, fetchBalance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...balanceData,
    refreshBalance,
  };
};

// Hook for multiple token balances
export const useMultipleTokenBalances = (
  tokens: Array<{ address: string; decimals: number }>,
  userAddress: string | null,
  options: UseTokenBalanceOptions = {}
) => {
  const [balances, setBalances] = useState<Record<string, TokenBalance>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshInterval = 30000, enableAutoRefresh = true } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMounted = useRef(true);

  const fetchAllBalances = useCallback(async () => {
    if (!userAddress || tokens.length === 0 || !isComponentMounted.current) {
      setBalances({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.JsonRpcProvider(
        SOMNIA_TESTNET_CONFIG.rpcUrls.default.http[0]
      );

      const balancePromises = tokens.map(async (token) => {
        try {
          let balance: bigint;

          // Check if it's native token
          if (
            token.address.toLowerCase() ===
              "0x0000000000000000000000000000000000000000" ||
            token.address.toLowerCase() ===
              "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          ) {
            balance = await provider.getBalance(userAddress);
          } else {
            // ERC20 token
            const tokenContract = new ethers.Contract(
              token.address,
              ["function balanceOf(address owner) view returns (uint256)"],
              provider
            );
            balance = await tokenContract.balanceOf(userAddress);
          }

          const formattedBalance = ethers.formatUnits(balance, token.decimals);
          const displayBalance = parseFloat(formattedBalance).toFixed(4);

          return {
            address: token.address,
            balanceData: {
              balance: balance.toString(),
              formattedBalance: displayBalance,
              isLoading: false,
              error: null,
              lastUpdated: Date.now(),
            },
          };
        } catch (error) {
          console.error(`Failed to fetch balance for ${token.address}:`, error);
          return {
            address: token.address,
            balanceData: {
              balance: "0",
              formattedBalance: "0.0000",
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch balance",
              lastUpdated: Date.now(),
            },
          };
        }
      });

      const results = await Promise.all(balancePromises);

      if (isComponentMounted.current) {
        const newBalances: Record<string, TokenBalance> = {};
        results.forEach(({ address, balanceData }) => {
          newBalances[address] = balanceData;
        });
        setBalances(newBalances);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch token balances:", error);
      if (isComponentMounted.current) {
        setError(
          error instanceof Error ? error.message : "Failed to fetch balances"
        );
        setIsLoading(false);
      }
    }
  }, [tokens, userAddress]);

  // Manual refresh function
  const refreshBalances = useCallback(() => {
    fetchAllBalances();
  }, [fetchAllBalances]);

  // Initial fetch and setup interval
  useEffect(() => {
    fetchAllBalances();

    if (enableAutoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchAllBalances, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchAllBalances, enableAutoRefresh, refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    balances,
    isLoading,
    error,
    refreshBalances,
  };
};
