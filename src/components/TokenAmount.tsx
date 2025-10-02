/**
 * TokenAmount Component
 *
 * A reusable component for displaying token amounts with proper decimal formatting
 * Ensures consistent display across the application
 */

import React from "react";
import {
  formatTokenAmount,
  formatUSDValue,
  fromBaseUnit,
  getTokenDisplayPrecision,
} from "@/lib/decimals";
import { TokenInfo } from "@/config/tokens";

interface TokenAmountProps {
  /** Amount in base units (BigInt) */
  amount: bigint;
  /** Token information */
  token: TokenInfo;
  /** Whether to show USD value */
  showUSD?: boolean;
  /** USD price per token (if showing USD) */
  usdPrice?: string;
  /** Custom precision override */
  precision?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show full precision instead of display precision */
  fullPrecision?: boolean;
}

interface HumanAmountProps {
  /** Human-readable amount string */
  amount: string;
  /** Token symbol */
  symbol: string;
  /** Whether to show USD value */
  showUSD?: boolean;
  /** USD price per token (if showing USD) */
  usdPrice?: string;
  /** Token decimals (for USD calculation) */
  decimals?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Display token amount from base units
 */
export function TokenAmount({
  amount,
  token,
  showUSD = false,
  usdPrice,
  precision,
  className = "",
  fullPrecision = false,
}: TokenAmountProps) {
  const displayPrecision =
    precision ??
    (fullPrecision ? undefined : getTokenDisplayPrecision(token.symbol));
  const formattedAmount = formatTokenAmount(
    amount,
    token.decimals,
    token.symbol,
    displayPrecision
  );

  return (
    <div className={className}>
      <span className="font-medium">{formattedAmount}</span>
      {showUSD && usdPrice && (
        <div className="text-sm text-gray-500">
          {formatUSDValue(amount, token.decimals, usdPrice)}
        </div>
      )}
    </div>
  );
}

/**
 * Display token amount from human-readable string
 */
export function HumanTokenAmount({
  amount,
  symbol,
  showUSD = false,
  usdPrice,
  decimals = 18,
  className = "",
}: HumanAmountProps) {
  return (
    <div className={className}>
      <span className="font-medium">
        {amount} {symbol}
      </span>
      {showUSD && usdPrice && decimals && (
        <div className="text-sm text-gray-500">
          ≈{" "}
          {formatUSDValue(
            BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals))),
            decimals,
            usdPrice
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Display percentage with proper formatting
 */
interface PercentageProps {
  /** Percentage in basis points (10000 = 100%) */
  basisPoints: bigint;
  /** Number of decimal places to show */
  precision?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show basis points value in tooltip */
  showBasisPoints?: boolean;
}

export function Percentage({
  basisPoints,
  precision = 2,
  className = "",
  showBasisPoints = false,
}: PercentageProps) {
  const percentage = fromBaseUnit(basisPoints, 2, precision);

  return (
    <span
      className={className}
      title={showBasisPoints ? `${basisPoints} basis points` : undefined}
    >
      {percentage}%
    </span>
  );
}

/**
 * Display ratio with health indicator
 */
interface RatioDisplayProps {
  /** Current ratio in basis points */
  currentRatio: bigint;
  /** Required minimum ratio in basis points */
  minRatio: bigint;
  /** Liquidation threshold in basis points */
  liquidationThreshold?: bigint;
  /** Additional CSS classes */
  className?: string;
}

export function RatioDisplay({
  currentRatio,
  minRatio,
  liquidationThreshold,
  className = "",
}: RatioDisplayProps) {
  const isHealthy = currentRatio >= minRatio;
  const isNearLiquidation =
    liquidationThreshold && currentRatio <= liquidationThreshold;

  const getStatusColor = () => {
    if (isNearLiquidation) return "text-red-600";
    if (!isHealthy) return "text-orange-600";
    return "text-green-600";
  };

  const getStatusText = () => {
    if (isNearLiquidation) return "At Risk";
    if (!isHealthy) return "Insufficient";
    return "Healthy";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Percentage basisPoints={currentRatio} className={getStatusColor()} />
      <span
        className={`text-xs px-2 py-1 rounded-full ${
          isHealthy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {getStatusText()}
      </span>
    </div>
  );
}

/**
 * Input field with token symbol and decimal validation
 */
interface TokenInputProps {
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Token information */
  token?: TokenInfo;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function TokenInput({
  value,
  onChange,
  token,
  placeholder,
  className = "",
  error,
  disabled = false,
}: TokenInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (token) return `0.0 (max ${token.decimals} decimals)`;
    return "0.0";
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={getPlaceholder()}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-md text-right
          ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }
          ${disabled ? "bg-gray-50 text-gray-500" : "bg-white"}
          focus:outline-none focus:ring-2 focus:ring-opacity-50
          ${className}
        `}
      />
      {token && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
          {token.symbol}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default TokenAmount;
