/**
 * @file multicall.ts
 * @description Efficient price fetching utility for Somnia L1 (no multicall contract needed)
 * @author DreamLend Team
 */

import { ethers } from "ethers";
import { SOMNIA_TESTNET_CONFIG } from "./contracts";

// Chainlink Aggregator ABI - only the functions we need
export const AGGREGATOR_ABI = [
  {
    name: "latestRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// Types

export interface PriceFeedCall {
  tokenAddress: string;
  priceFeedAddress: string;
}

export interface PriceData {
  tokenAddress: string;
  priceFeedAddress: string;
  price: bigint;
  decimals: number;
  updatedAt: number;
  isStale: boolean;
  success: boolean;
  priceUSD: string; // Formatted USD price
}

/**
 * Price fetching utility class for Somnia L1 (uses Promise.all instead of multicall)
 */
export class MulticallUtil {
  private provider: ethers.JsonRpcProvider;

  constructor(providerOrRpc?: ethers.JsonRpcProvider | string) {
    // Use provided provider or create new one with Somnia testnet RPC
    if (typeof providerOrRpc === "string") {
      this.provider = new ethers.JsonRpcProvider(providerOrRpc);
    } else if (providerOrRpc) {
      this.provider = providerOrRpc;
    } else {
      this.provider = new ethers.JsonRpcProvider(
        SOMNIA_TESTNET_CONFIG.rpcUrls.default.http[0]
      );
    }
  }

  /**
   * Batch fetch price feed data for multiple tokens using Promise.all
   * This is the main function for fetching current prices efficiently without multicall
   */
  async batchFetchPriceFeeds(
    priceFeedCalls: PriceFeedCall[]
  ): Promise<PriceData[]> {
    if (priceFeedCalls.length === 0) {
      return [];
    }

    try {
      // Create promises for all price feed calls
      const pricePromises = priceFeedCalls.map(
        async ({ tokenAddress, priceFeedAddress }) => {
          let priceData: PriceData = {
            tokenAddress,
            priceFeedAddress,
            price: 0n,
            decimals: 8, // Default to 8 decimals (common for USD price feeds)
            updatedAt: 0,
            isStale: true,
            success: false,
            priceUSD: "0.00",
          };

          try {
            // Create contract instance for this price feed
            const priceFeedContract = new ethers.Contract(
              priceFeedAddress,
              AGGREGATOR_ABI,
              this.provider
            );

            // Fetch both latestRoundData and decimals in parallel
            const [roundData, decimals] = await Promise.all([
              priceFeedContract.latestRoundData(),
              priceFeedContract.decimals(),
            ]);

            const [, answer, , updatedAt] = roundData;

            // Validate price data
            if (answer > 0 && updatedAt > 0) {
              const currentTime = Math.floor(Date.now() / 1000);
              const isStale = currentTime - Number(updatedAt) > 3600; // 1 hour staleness

              const priceUSD = this.formatPriceToUSD(
                BigInt(answer.toString()),
                Number(decimals),
                4 // Show more precision for better UX
              );

              priceData = {
                tokenAddress,
                priceFeedAddress,
                price: BigInt(answer.toString()),
                decimals: Number(decimals),
                updatedAt: Number(updatedAt),
                isStale,
                success: true,
                priceUSD,
              };
            }
          } catch (error) {
            console.warn(
              `Failed to fetch price data for token ${tokenAddress} from ${priceFeedAddress}:`,
              error
            );
          }

          return priceData;
        }
      );

      // Wait for all price fetches to complete
      const priceDataList = await Promise.all(pricePromises);
      return priceDataList;
    } catch (error) {
      console.error("Batch price feed fetch failed:", error);
      throw error;
    }
  }

  /**
   * Helper method to get unique price feeds from a list of tokens
   */
  static getUniquePriceFeeds(
    tokenAddresses: string[],
    getPriceFeedAddress: (tokenAddress: string) => string | undefined
  ): PriceFeedCall[] {
    const uniqueFeeds = new Map<string, PriceFeedCall>();

    tokenAddresses.forEach((tokenAddress) => {
      const priceFeedAddress = getPriceFeedAddress(tokenAddress);
      if (priceFeedAddress && priceFeedAddress !== ethers.ZeroAddress) {
        // Use price feed address as key to ensure uniqueness
        if (!uniqueFeeds.has(priceFeedAddress)) {
          uniqueFeeds.set(priceFeedAddress, {
            tokenAddress,
            priceFeedAddress,
          });
        }
      }
    });

    return Array.from(uniqueFeeds.values());
  }

  /**
   * Create a price map from price data for easy lookup
   */
  static createPriceMap(priceDataList: PriceData[]): Map<string, PriceData> {
    const priceMap = new Map<string, PriceData>();

    priceDataList.forEach((priceData) => {
      // Key by both token address and price feed address for flexibility
      priceMap.set(priceData.tokenAddress.toLowerCase(), priceData);
      priceMap.set(priceData.priceFeedAddress.toLowerCase(), priceData);
    });

    return priceMap;
  }

  /**
   * Format price to USD with proper decimal handling
   */
  formatPriceToUSD(
    price: bigint,
    decimals: number,
    displayDecimals: number = 2
  ): string {
    const divisor = 10n ** BigInt(decimals);
    const wholePart = price / divisor;
    const fractionalPart = price % divisor;

    // Convert to float for display
    const priceFloat =
      Number(wholePart) + Number(fractionalPart) / Number(divisor);

    return priceFloat.toFixed(displayDecimals);
  }

  /**
   * Calculate USD value of a token amount using current price
   */
  static calculateUSDValue(
    tokenAmount: bigint,
    tokenDecimals: number,
    priceData: PriceData
  ): string {
    if (!priceData.success || priceData.price <= 0n) {
      return "0.00";
    }

    // Normalize token amount to 18 decimals for calculation
    let normalizedAmount: bigint;
    if (tokenDecimals < 18) {
      normalizedAmount = tokenAmount * 10n ** BigInt(18 - tokenDecimals);
    } else if (tokenDecimals > 18) {
      normalizedAmount = tokenAmount / 10n ** BigInt(tokenDecimals - 18);
    } else {
      normalizedAmount = tokenAmount;
    }

    // Normalize price to 18 decimals
    let normalizedPrice: bigint;
    if (priceData.decimals < 18) {
      normalizedPrice =
        priceData.price * 10n ** BigInt(18 - priceData.decimals);
    } else if (priceData.decimals > 18) {
      normalizedPrice =
        priceData.price / 10n ** BigInt(priceData.decimals - 18);
    } else {
      normalizedPrice = priceData.price;
    }

    // Calculate USD value: (amount * price) / 10^18
    const usdValue = (normalizedAmount * normalizedPrice) / 10n ** 18n;

    // Convert to display format
    const divisor = 10n ** 18n;
    const wholePart = usdValue / divisor;
    const fractionalPart = usdValue % divisor;
    const usdFloat =
      Number(wholePart) + Number(fractionalPart) / Number(divisor);

    return usdFloat.toFixed(2);
  }
}

// Export singleton instance for convenience
export const multicall = new MulticallUtil();
