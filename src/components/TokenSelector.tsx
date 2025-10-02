"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Check, Wallet, RefreshCw } from "lucide-react";
import {
  TokenInfo,
  getAllSupportedTokens,
  TOKEN_CATEGORIES,
  RISK_COLORS,
  formatBasisPoints,
  DEFAULT_PARAMETERS,
} from "@/config/tokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";

interface TokenSelectorProps {
  selectedToken?: TokenInfo;
  onTokenSelect: (token: TokenInfo) => void;
  label: string;
  placeholder?: string;
  excludeToken?: TokenInfo; // Don't show this token in the list (e.g., can't use same token for loan and collateral)
  userAddress?: string | null; // User's wallet address to fetch balance
  showBalance?: boolean; // Whether to show balance
}

export interface TokenSelectorRef {
  refreshBalance: () => void;
}

export const TokenSelector = forwardRef<TokenSelectorRef, TokenSelectorProps>(
  (
    {
      selectedToken,
      onTokenSelect,
      label,
      placeholder = "Select a token",
      excludeToken,
      userAddress,
      showBalance = false,
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const allTokens = getAllSupportedTokens();

    // // Fetch balance for selected token
    // const {
    //   formattedBalance,
    //   isLoading: isLoadingBalance,
    //   error: balanceError,
    //   refreshBalance,
    //   lastUpdated,
    // } = useTokenBalance(
    //   selectedToken?.address || null,
    //   userAddress || null,
    //   selectedToken?.decimals || 18,
    //   {
    //     refreshInterval: 30000, // 30 seconds
    //     enableAutoRefresh: showBalance && !!selectedToken && !!userAddress,
    //   }
    // );

    // Filter out tokens with placeholder addresses (0x000...000) and excluded tokens
    const availableTokens = allTokens.filter((token) => {
      // Exclude tokens with zero address (unassigned placeholders)
      if (token.address === "0x0000000000000000000000000000000000000000") {
        return false;
      }
      // Exclude the specified token (e.g., can't use same token for loan and collateral)
      if (excludeToken && token.address === excludeToken.address) {
        return false;
      }
      return true;
    });

    const handleSelect = (token: TokenInfo) => {
      onTokenSelect(token);
      setOpen(false);
    };

    // Expose refresh function to parent component
    // useImperativeHandle(
    //   ref,
    //   () => ({
    //     refreshBalance,
    //   }),
    //   [refreshBalance]
    // );

    return (
      <div className="space-y-2">
        <Label htmlFor="token-selector" className="text-base font-medium">
          {label}
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="token-selector"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-auto p-3"
            >
              {selectedToken ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {selectedToken.symbol}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          RISK_COLORS[selectedToken.volatilityTier]
                        }`}
                      >
                        {selectedToken.volatilityTier}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedToken.name}
                    </span>
                  </div>
                  {/* {showBalance && userAddress && (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3 w-3 text-muted-foreground" />
                        {isLoadingBalance ? (
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">
                              Loading...
                            </span>
                          </div>
                        ) : balanceError ? (
                          <span className="text-sm text-destructive">
                            Error
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {formattedBalance}
                          </span>
                        )}
                      </div>
                      {lastUpdated > 0 && !isLoadingBalance && (
                        <span className="text-xs text-muted-foreground">
                          Updated{" "}
                          {Math.floor((Date.now() - lastUpdated) / 1000)}s ago
                        </span>
                      )}
                    </div>
                  )} */}
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <div className="max-h-[300px] overflow-y-auto">
              {Object.entries(TOKEN_CATEGORIES).map(
                ([categoryKey, category]) => {
                  const categoryTokens = category.tokens.filter((token) => {
                    // Exclude tokens with zero address (unassigned placeholders)
                    if (
                      token.address ===
                      "0x0000000000000000000000000000000000000000"
                    ) {
                      return false;
                    }
                    // Exclude the specified token
                    if (
                      excludeToken &&
                      token.address === excludeToken.address
                    ) {
                      return false;
                    }
                    return true;
                  });

                  if (categoryTokens.length === 0) return null;

                  return (
                    <div key={categoryKey} className="p-2">
                      <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                        {category.name}
                      </div>
                      <div className="text-xs text-muted-foreground px-2 mb-2">
                        {category.description}
                      </div>

                      {categoryTokens.map((token) => (
                        <button
                          key={token.address}
                          className="w-full flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors"
                          onClick={() => handleSelect(token)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {token.symbol}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    RISK_COLORS[token.volatilityTier]
                                  }`}
                                >
                                  {token.volatilityTier}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {token.name}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                Min Collateral:{" "}
                                {formatBasisPoints(
                                  DEFAULT_PARAMETERS[token.volatilityTier]
                                    .minCollateralRatio
                                )}
                              </div>
                            </div>
                          </div>

                          {selectedToken?.address === token.address && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  );
                }
              )}

              {availableTokens.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  No tokens available
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* {selectedToken && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{selectedToken.description}</div>
              {showBalance && userAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshBalance}
                  disabled={isLoadingBalance}
                  className="h-6 px-2"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isLoadingBalance ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">Volatility:</span>{" "}
                {selectedToken.volatilityTier}
              </div>
              <div>
                <span className="font-medium">Decimals:</span>{" "}
                {selectedToken.decimals}
              </div>
              {showBalance && userAddress && (
                <>
                  <div>
                    <span className="font-medium">Your Balance:</span>{" "}
                    {isLoadingBalance ? (
                      <RefreshCw className="h-3 w-3 animate-spin inline" />
                    ) : balanceError ? (
                      <span className="text-destructive">Error</span>
                    ) : (
                      <span className="text-primary font-medium">
                        {formattedBalance} {selectedToken.symbol}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Contract:</span>{" "}
                    <span className="font-mono">
                      {selectedToken.address.slice(0, 6)}...
                      {selectedToken.address.slice(-4)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )} */}
      </div>
    );
  }
);

TokenSelector.displayName = "TokenSelector";
