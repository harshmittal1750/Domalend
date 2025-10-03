import { TokenPrice } from "@/hooks/useTokenPrices";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, TrendingUp, Sparkles } from "lucide-react";

interface DualPriceDisplayProps {
  price?: TokenPrice;
  showLabel?: boolean;
  className?: string;
}

/**
 * DualPriceDisplay - Shows both market price and algorithmic valuation for tokens
 *
 * For standard tokens (USDC, USDT): Shows single Chainlink price
 * For Doma fractional tokens: Shows market price AND DomaRank algorithmic price
 */
export function DualPriceDisplay({
  price,
  showLabel = true,
  className = "",
}: DualPriceDisplayProps) {
  if (!price) {
    return (
      <span className="text-sm text-muted-foreground">Price unavailable</span>
    );
  }

  // Standard token - just show one price
  if (!price.hasDomaRankOracle) {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center gap-2">
          {showLabel && (
            <span className="text-xs text-muted-foreground">Price:</span>
          )}
          <span className="text-base font-bold text-primary">
            ${price.priceUSD}
          </span>
          <Badge
            variant="outline"
            className="text-xs bg-green-50 text-green-700 border-green-200"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Chainlink
          </Badge>
        </div>
      </div>
    );
  }

  // Doma fractional token - show both prices
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Live Market Price */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                {showLabel && (
                  <span className="text-xs text-muted-foreground">Market:</span>
                )}
                <span className="text-base font-semibold text-foreground">
                  ${price.liveMarketPrice}
                </span>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">Live Market Price</p>
                <p className="text-xs text-muted-foreground">
                  Current trading price from Doma Subgraph/DEX. This reflects
                  real-time supply and demand.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* DomaRank Algorithmic Price */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                {showLabel && (
                  <span className="text-xs text-muted-foreground">
                    Collateral:
                  </span>
                )}
                <span className="text-base font-bold text-blue-600">
                  ${price.domaRankPrice}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  DomaRank
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">DomaRank Collateral Value</p>
                <p className="text-xs text-muted-foreground">
                  Risk-adjusted algorithmic valuation. Based on domain age,
                  keywords, TLD, and market demand. Used for lending
                  calculations to protect lenders.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Price Difference Indicator */}
      {price.liveMarketPrice && price.domaRankPrice && (
        <div className="pt-1">
          {(() => {
            const marketPrice = parseFloat(price.liveMarketPrice);
            const oraclePrice = parseFloat(price.domaRankPrice);
            const difference =
              ((marketPrice - oraclePrice) / marketPrice) * 100;

            return (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">
                  {difference > 0 ? "+" : ""}
                  {difference.toFixed(1)}% safety margin
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">
                        Our pricing algorithm provides a more conservative
                        valuation to protect lenders from market volatility and
                        overvaluation.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/**
 * CompactPriceDisplay - Compact version for table cells
 */
export function CompactPriceDisplay({ price }: { price: TokenPrice }) {
  if (!price) return null;

  if (!price.hasDomaRankOracle) {
    return (
      <div className="text-sm">
        <span className="font-bold">${price.priceUSD}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-0.5 cursor-help">
            <div className="text-sm font-semibold">
              ${price.liveMarketPrice}
            </div>
            <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />${price.domaRankPrice}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="space-y-2 text-xs">
            <div>
              <strong>Market:</strong> ${price.liveMarketPrice}
              <div className="text-muted-foreground">Live DEX price</div>
            </div>
            <div>
              <strong>Collateral:</strong> ${price.domaRankPrice}
              <div className="text-muted-foreground">DomaRank value</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * PriceComparisonCard - Full card view with explanations
 */
export function PriceComparisonCard({
  loanTokenPrice,
  collateralTokenPrice,
  loanTokenSymbol,
  collateralTokenSymbol,
}: {
  loanTokenPrice: TokenPrice;
  collateralTokenPrice: TokenPrice;
  loanTokenSymbol: string;
  collateralTokenSymbol: string;
}) {
  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <Info className="h-4 w-4 text-primary" />
        Pricing Information
      </h4>

      {/* Loan Token */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Loan Token ({loanTokenSymbol})
        </div>
        <DualPriceDisplay price={loanTokenPrice} showLabel={true} />
      </div>

      {/* Collateral Token */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Collateral Token ({collateralTokenSymbol})
        </div>
        <DualPriceDisplay price={collateralTokenPrice} showLabel={true} />
      </div>

      {/* Explanation */}
      {(loanTokenPrice.hasDomaRankOracle ||
        collateralTokenPrice.hasDomaRankOracle) && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Why two prices?</p>
            <p>
              <strong>Market Price:</strong> Current trading price on DEX
            </p>
            <p>
              <strong>Collateral Value:</strong> Conservative AI-adjusted price
              used for lending calculations
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
