/**
 * Decimal Handling Utilities for DreamLend
 *
 * Core Rule: All internal calculations, storage, and smart contract interactions
 * must use base units (wei-like). Users only see human-readable macro values.
 */

import { ethers } from "ethers";

/**
 * Convert human-readable amount to base unit (wei-like)
 * @param amount - Human-readable amount as string or number
 * @param decimals - Token decimal places (e.g., 18 for ETH, 6 for USDC)
 * @returns BigInt in base units
 *
 * Examples:
 * - toBaseUnit("1.5", 18) → 1500000000000000000n (1.5 ETH in wei)
 * - toBaseUnit("250.75", 6) → 250750000n (250.75 USDC in base units)
 */
export function toBaseUnit(amount: string | number, decimals: number): bigint {
  if (!amount || amount === "" || amount === "0") {
    return 0n;
  }

  try {
    // Convert to string to handle both string and number inputs
    const amountStr = amount.toString();

    // Use ethers.parseUnits for precise decimal handling
    return ethers.parseUnits(amountStr, decimals);
  } catch (error) {
    console.error(
      `Error converting ${amount} with ${decimals} decimals to base unit:`,
      error
    );
    return 0n;
  }
}

/**
 * Convert base unit (wei-like) to human-readable amount
 * @param amount - Amount in base units as BigInt
 * @param decimals - Token decimal places
 * @param precision - Number of decimal places to display (default: full precision)
 * @returns Human-readable string
 *
 * Examples:
 * - fromBaseUnit(1500000000000000000n, 18) → "1.5"
 * - fromBaseUnit(250750000n, 6) → "250.75"
 * - fromBaseUnit(1000000n, 6, 2) → "1.00" (with 2 decimal precision)
 */
export function fromBaseUnit(
  amount: bigint,
  decimals: number,
  precision?: number
): string {
  if (!amount || amount === 0n) {
    return "0";
  }

  try {
    // Use ethers.formatUnits for precise decimal handling
    const formatted = ethers.formatUnits(amount, decimals);

    // Apply precision if specified
    if (precision !== undefined) {
      const num = parseFloat(formatted);
      return num.toFixed(precision);
    }

    // Remove trailing zeros for cleaner display
    return parseFloat(formatted).toString();
  } catch (error) {
    console.error(
      `Error converting ${amount} with ${decimals} decimals from base unit:`,
      error
    );
    return "0";
  }
}

/**
 * Format amount with token symbol for display
 * @param amount - Amount in base units
 * @param decimals - Token decimal places
 * @param symbol - Token symbol (e.g., "ETH", "USDC")
 * @param precision - Number of decimal places to display
 * @returns Formatted string with symbol
 *
 * Examples:
 * - formatTokenAmount(1500000000000000000n, 18, "ETH") → "1.5 ETH"
 * - formatTokenAmount(250750000n, 6, "USDC", 2) → "250.75 USDC"
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  symbol: string,
  precision?: number
): string {
  const humanAmount = fromBaseUnit(amount, decimals, precision);
  return `${humanAmount} ${symbol}`;
}

/**
 * Format amount as USD value
 * @param amount - Amount in base units
 * @param decimals - Token decimal places
 * @param pricePerToken - Price per token in USD (as string)
 * @param precision - Number of decimal places to display (default: 2)
 * @returns Formatted USD string
 *
 * Examples:
 * - formatUSDValue(1000000000000000000n, 18, "2000") → "$2,000.00"
 * - formatUSDValue(1000000n, 6, "1.00") → "$1.00"
 */
export function formatUSDValue(
  amount: bigint,
  decimals: number,
  pricePerToken: string,
  precision: number = 2
): string {
  if (!amount || amount === 0n || !pricePerToken || pricePerToken === "0") {
    return "$0.00";
  }

  try {
    // Convert amount to human-readable
    const tokenAmount = fromBaseUnit(amount, decimals);

    // Calculate USD value
    const usdValue = parseFloat(tokenAmount) * parseFloat(pricePerToken);

    // Format as USD with commas
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(usdValue);
  } catch (error) {
    console.error(`Error formatting USD value:`, error);
    return "$0.00";
  }
}

/**
 * BigInt Math Utilities for precise calculations
 */
export const BigIntMath = {
  /**
   * Multiply two BigInt values with decimal scaling
   * @param a - First value in base units
   * @param b - Second value in base units
   * @param decimalsA - Decimals for first value
   * @param decimalsB - Decimals for second value
   * @param resultDecimals - Desired decimals for result
   * @returns Result in base units with specified decimals
   */
  multiply(
    a: bigint,
    b: bigint,
    decimalsA: number,
    decimalsB: number,
    resultDecimals: number
  ): bigint {
    const product = a * b;
    const totalDecimals = decimalsA + decimalsB;

    if (totalDecimals > resultDecimals) {
      return product / 10n ** BigInt(totalDecimals - resultDecimals);
    } else if (totalDecimals < resultDecimals) {
      return product * 10n ** BigInt(resultDecimals - totalDecimals);
    }

    return product;
  },

  /**
   * Divide two BigInt values with decimal scaling
   * @param a - Numerator in base units
   * @param b - Denominator in base units
   * @param decimalsA - Decimals for numerator
   * @param decimalsB - Decimals for denominator
   * @param resultDecimals - Desired decimals for result
   * @returns Result in base units with specified decimals
   */
  divide(
    a: bigint,
    b: bigint,
    decimalsA: number,
    decimalsB: number,
    resultDecimals: number
  ): bigint {
    if (b === 0n) {
      throw new Error("Division by zero");
    }

    // Scale numerator to maintain precision
    const scaledNumerator =
      a * 10n ** BigInt(resultDecimals + decimalsB - decimalsA);
    return scaledNumerator / b;
  },

  /**
   * Calculate percentage of a value
   * @param value - Value in base units
   * @param percentage - Percentage as BigInt in basis points (10000 = 100%)
   * @param decimals - Decimals for the value
   * @returns Percentage of value in base units
   */
  percentage(value: bigint, percentage: bigint, decimals: number): bigint {
    return (value * percentage) / 10000n;
  },

  /**
   * Calculate ratio between two values
   * @param numerator - Numerator in base units
   * @param denominator - Denominator in base units
   * @param decimalsNum - Decimals for numerator
   * @param decimalsDen - Decimals for denominator
   * @returns Ratio in basis points (10000 = 100%)
   */
  ratio(
    numerator: bigint,
    denominator: bigint,
    decimalsNum: number,
    decimalsDen: number
  ): bigint {
    if (denominator === 0n) {
      return 0n;
    }

    // Normalize to same decimal places
    const normalizedNum =
      decimalsNum < decimalsDen
        ? numerator * 10n ** BigInt(decimalsDen - decimalsNum)
        : numerator;

    const normalizedDen =
      decimalsDen < decimalsNum
        ? denominator * 10n ** BigInt(decimalsNum - decimalsDen)
        : denominator;

    return (normalizedNum * 10000n) / normalizedDen;
  },
};

/**
 * Input validation utilities
 */
export const DecimalValidation = {
  /**
   * Validate if input string is a valid decimal number
   * @param input - User input string
   * @returns boolean
   */
  isValidDecimal(input: string): boolean {
    if (!input || input.trim() === "") return false;

    // Allow numbers with optional decimal point (including trailing decimal)
    const decimalRegex = /^\d+(\.\d*)?$/;
    return decimalRegex.test(input.trim());
  },

  /**
   * Validate if input string is a complete valid decimal number (for final validation)
   * @param input - User input string
   * @returns boolean
   */
  isCompleteDecimal(input: string): boolean {
    if (!input || input.trim() === "") return false;

    // Require at least one digit after decimal point if decimal point exists
    const decimalRegex = /^\d+(\.\d+)?$/;
    return decimalRegex.test(input.trim());
  },

  /**
   * Validate if input doesn't exceed maximum decimal places
   * @param input - User input string
   * @param maxDecimals - Maximum allowed decimal places
   * @returns boolean
   */
  hasValidPrecision(input: string, maxDecimals: number): boolean {
    const parts = input.split(".");
    if (parts.length <= 1) return true; // No decimal point

    return parts[1].length <= maxDecimals;
  },

  /**
   * Clean and normalize user input
   * @param input - Raw user input
   * @param maxDecimals - Maximum decimal places allowed
   * @returns Cleaned input string
   */
  cleanInput(input: string, maxDecimals: number): string {
    // Remove non-numeric characters except decimal point
    let cleaned = input.replace(/[^0-9.]/g, "");

    // Handle multiple decimal points - keep only the first one
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    // Limit decimal places
    const [whole, decimal] = cleaned.split(".");
    if (decimal && decimal.length > maxDecimals) {
      cleaned = whole + "." + decimal.substring(0, maxDecimals);
    }

    return cleaned;
  },
};

/**
 * Token-specific utilities
 */
export function getTokenDisplayPrecision(symbol: string): number {
  // Define display precision for different token types
  const precisionMap: Record<string, number> = {
    // Stablecoins - show 2 decimal places
    USDT: 2,
    USDC: 2,
    DAI: 2,
    MUSDT: 2,
    MUSDC: 2,

    // Major cryptocurrencies - show 4 decimal places
    ETH: 4,
    WETH: 4,
    BTC: 4,
    WBTC: 4,
    MWBTC: 4,

    // Other tokens - show 3 decimal places
    ARB: 3,
    MARB: 3,
    SOL: 3,
    MSOL: 3,
  };

  return precisionMap[symbol.toUpperCase()] || 4; // Default to 4 decimal places
}

/**
 * Export commonly used constants
 */
export const DECIMAL_CONSTANTS = {
  BASIS_POINTS_SCALE: 10000n, // 100% = 10000 basis points
  PERCENTAGE_SCALE: 100n, // 100% = 100
  ZERO: 0n,
  ONE_ETH: 1000000000000000000n, // 1 ETH in wei
  ONE_USDC: 1000000n, // 1 USDC in base units
} as const;
