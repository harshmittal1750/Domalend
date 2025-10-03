"use client";

import { useState, useImperativeHandle, forwardRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  Check,
  Wallet,
  RefreshCw,
  Search,
  X,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  TokenInfo,
  getCryptoTokens,
  RISK_COLORS,
  formatBasisPoints,
  DEFAULT_PARAMETERS,
} from "@/config/tokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useAllDomainTokens } from "@/hooks/useFractionalTokens";
import { Skeleton } from "@/components/ui/skeleton";

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
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch domain tokens from GraphQL
    const {
      tokens: domainTokens,
      loading: domainTokensLoading,
      error: domainTokensError,
    } = useAllDomainTokens();

    // Get crypto tokens from config (USDTEST, MUSDC, MWBTC, MARB, MSOL)
    const cryptoTokens = getCryptoTokens();

    // Merge crypto and domain tokens
    const allTokens = useMemo(() => {
      return [...cryptoTokens, ...domainTokens];
    }, [cryptoTokens, domainTokens]);

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
      setSearchQuery(""); // Reset search on close
    };

    // Filter tokens based on search query
    const filteredTokens = useMemo(() => {
      if (!searchQuery.trim()) return availableTokens;

      const query = searchQuery.toLowerCase();
      return availableTokens.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.symbol.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query)
      );
    }, [availableTokens, searchQuery]);

    // Get popular tokens (domain tokens with oracle support)
    const popularTokens = useMemo(
      () =>
        availableTokens
          .filter((t) => t.category === "domain" && t.hasDomaRankOracle)
          .slice(0, 4),
      [availableTokens]
    );

    // Create dynamic token categories
    const tokenCategories = useMemo(() => {
      return {
        stablecoin: {
          name: "Stablecoins",
          description: "Low volatility, USD-pegged assets",
          tokens: allTokens.filter((t) => t.category === "stablecoin"),
        },
        crypto: {
          name: "Cryptocurrencies",
          description: "Major blockchain native tokens",
          tokens: allTokens.filter((t) => t.category === "crypto"),
        },
        defi: {
          name: "DeFi Tokens",
          description: "Decentralized finance protocol tokens",
          tokens: allTokens.filter((t) => t.category === "defi"),
        },
        domain: {
          name: "Domain Tokens",
          description: "Fractional ownership of premium domains (AI-priced)",
          tokens: allTokens.filter((t) => t.category === "domain"),
        },
      };
    }, [allTokens]);

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              id="token-selector"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-auto p-4 hover:bg-accent/50 transition-all duration-300 hover:scale-[1.01] luxury-shadow-sm"
            >
              {selectedToken ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    {/* Selected Token Image */}
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0">
                      {selectedToken.domainMetadata?.image ? (
                        <img
                          src={selectedToken.domainMetadata.image}
                          alt={selectedToken.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-cyan-500/20 to-primary/20 flex items-center justify-center"><span class="text-sm font-bold">${selectedToken.symbol[0]}</span></div>`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-primary/20 flex items-center justify-center">
                          <span className="text-sm font-bold">
                            {selectedToken.symbol[0]}
                          </span>
                        </div>
                      )}
                    </div>
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
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0 gap-0 luxury-shadow-lg">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
              <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Select {label}
              </DialogTitle>
              <DialogDescription>
                Choose from stablecoins, crypto assets, or fractionalized domain
                tokens
              </DialogDescription>
            </DialogHeader>

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, symbol, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Popular Tokens - Quick Select */}
            {!searchQuery && popularTokens.length > 0 && (
              <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Popular Domain Tokens
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularTokens.map((token) => (
                    <Button
                      key={token.address}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelect(token)}
                      className={`
                        transition-all duration-300 hover:scale-105 flex items-center gap-2
                        ${selectedToken?.address === token.address ? "border-cyan-500 bg-cyan-500/10" : ""}
                      `}
                    >
                      {token.domainMetadata?.image && (
                        <img
                          src={token.domainMetadata.image}
                          alt={token.name}
                          className="w-5 h-5 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      {token.symbol}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Token List */}
            <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
              {domainTokensLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border"
                    >
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && filteredTokens.length === 0 ? (
                <div className="py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    No tokens found matching "{searchQuery}"
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(tokenCategories).map(
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
                        // Apply search filter
                        if (searchQuery) {
                          return filteredTokens.some(
                            (ft) => ft.address === token.address
                          );
                        }
                        return true;
                      });

                      if (categoryTokens.length === 0) return null;

                      return (
                        <div key={categoryKey}>
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                              <span className="text-sm font-semibold text-foreground">
                                {category.name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {category.description}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {categoryTokens.map((token) => {
                              const isSelected =
                                selectedToken?.address === token.address;
                              const hasOracle =
                                token.hasDomaRankOracle === true;
                              const isComingSoon =
                                token.category === "domain" && !hasOracle;

                              return (
                                <button
                                  key={token.address}
                                  disabled={isComingSoon}
                                  className={`
                                    w-full flex items-center justify-between p-4 rounded-xl
                                    transition-all duration-300 group
                                    ${
                                      isComingSoon
                                        ? "opacity-60 cursor-not-allowed"
                                        : "hover:bg-gradient-to-r hover:from-cyan-500/5 hover:to-primary/5 hover:luxury-shadow-sm hover:scale-[1.01]"
                                    }
                                    ${isSelected ? "bg-gradient-to-r from-cyan-500/10 to-primary/10 border-2 border-cyan-500/30" : "border-2 border-transparent"}
                                  `}
                                  onClick={() =>
                                    !isComingSoon && handleSelect(token)
                                  }
                                >
                                  <div className="flex items-start gap-4 flex-1">
                                    {/* Token Icon/Image */}
                                    <div
                                      className={`
                                      w-12 h-12 rounded-full flex items-center justify-center
                                      overflow-hidden
                                      border-2 border-primary/30
                                      group-hover:scale-110 transition-transform duration-300
                                      ${!token.domainMetadata?.image ? "bg-gradient-to-br from-cyan-500/20 to-primary/20" : ""}
                                    `}
                                    >
                                      {token.domainMetadata?.image ? (
                                        <img
                                          src={token.domainMetadata.image}
                                          alt={token.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            // Fallback to letter if image fails to load
                                            e.currentTarget.style.display =
                                              "none";
                                            e.currentTarget.parentElement!.innerHTML = `<span class="text-xl font-bold text-foreground">${token.symbol[0]}</span>`;
                                          }}
                                        />
                                      ) : (
                                        <span className="text-xl font-bold text-foreground">
                                          {token.symbol[0]}
                                        </span>
                                      )}
                                    </div>

                                    {/* Token Info */}
                                    <div className="flex flex-col items-start flex-1">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="font-semibold text-lg text-foreground">
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
                                        {isComingSoon && (
                                          <Badge className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Coming Soon
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-sm text-muted-foreground mb-2">
                                        {token.name}
                                      </span>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span>
                                          Min Collateral:{" "}
                                          <span className="font-medium text-foreground">
                                            {formatBasisPoints(
                                              DEFAULT_PARAMETERS[
                                                token.volatilityTier
                                              ].minCollateralRatio
                                            )}
                                          </span>
                                        </span>
                                        {token.isDomainToken && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200"
                                          >
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Domain Token
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Selected Check */}
                                  {isSelected && (
                                    <div className="ml-3">
                                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                        <Check className="h-4 w-4 text-primary-foreground" />
                                      </div>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
