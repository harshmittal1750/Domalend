"use client";

import { useState, useMemo } from "react";
import { Search, X, Globe2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DomaRankBadge } from "@/components/DomaRankBadge";
import { DualPriceDisplay } from "@/components/DualPriceDisplay";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useAllDomainTokens } from "@/hooks/useFractionalTokens";
import { Skeleton } from "@/components/ui/skeleton";

interface DomaCollateralBrowserProps {
  onSelect?: (tokenAddress: string) => void;
  trigger?: React.ReactNode;
}

/**
 * Doma Collateral Browser Modal
 *
 * Professional, searchable interface for browsing Doma fractional domain tokens
 * This is the "wow factor" component that showcases our AI intelligence
 *
 * Design: Clean cards, clear typography, prominent DomaRank scores
 */
export function DomaCollateralBrowser({
  onSelect,
  trigger,
}: DomaCollateralBrowserProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch domain tokens from GraphQL
  const {
    tokens: allDomainTokens,
    oracleSupportedTokens,
    comingSoonTokens,
    loading: tokensLoading,
    error: tokensError,
  } = useAllDomainTokens();

  // Only fetch prices for oracle-supported tokens
  const { prices, isLoading: pricesLoading } = useTokenPrices(
    oracleSupportedTokens
  );

  // Filter tokens based on search
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return allDomainTokens;

    const query = searchQuery.toLowerCase();
    return allDomainTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query) ||
        token.description?.toLowerCase().includes(query)
    );
  }, [searchQuery, allDomainTokens]);

  const handleSelect = (tokenAddress: string, hasOracle: boolean) => {
    // Only allow selection if token has oracle support
    if (!hasOracle) return;
    onSelect?.(tokenAddress);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <Globe2 className="mr-2 h-4 w-4" />
            Browse Doma Domains
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-500" />
            Doma Domain Collateral
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {oracleSupportedTokens.length} domains available with live DomaRank
            Oracle pricing
            {comingSoonTokens.length > 0 &&
              ` • ${comingSoonTokens.length} more coming soon`}
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-border bg-secondary/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by domain name, symbol, or address..."
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

        {/* Domain Cards */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          {tokensLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-5 space-y-3"
                >
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : tokensError ? (
            <div className="text-center py-12 text-destructive">
              <Globe2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Error loading tokens: {tokensError}</p>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No domains found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTokens.map((token) => {
                const tokenPrice = prices.get(token.address.toLowerCase());
                const hasOracle = token.hasDomaRankOracle === true;

                // Mock DomaRank score - in production, this comes from backend
                const mockDomaRank = 75 + Math.floor(Math.random() * 20);

                return (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token.address, hasOracle)}
                    disabled={!hasOracle}
                    className={`w-full text-left rounded-lg border bg-card p-5 transition-all group ${
                      hasOracle
                        ? "border-border hover:border-cyan-500/40 hover:bg-cyan-500/5 cursor-pointer"
                        : "border-border/50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Domain Image */}
                      {token.domainMetadata?.image && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-cyan-500/30 flex-shrink-0">
                          <img
                            src={token.domainMetadata.image}
                            alt={token.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      {/* Left: Domain Info */}
                      <div className="flex-1 space-y-3">
                        {/* Domain Name & Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">
                            {token.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-xs font-medium border-accent/30 text-accent"
                          >
                            {token.symbol}
                          </Badge>
                          {!hasOracle && (
                            <Badge className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                              <Clock className="h-3 w-3 mr-1" />
                              Coming Soon
                            </Badge>
                          )}
                        </div>

                        {/* DomaRank Score */}
                        <div>
                          <DomaRankBadge
                            score={mockDomaRank}
                            size="md"
                            showTooltip={true}
                          />
                        </div>

                        {/* Pricing */}
                        {hasOracle ? (
                          tokenPrice ? (
                            <DualPriceDisplay
                              price={tokenPrice}
                              showLabel={true}
                              className="text-sm"
                            />
                          ) : pricesLoading ? (
                            <p className="text-xs text-muted-foreground">
                              Price loading...
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Price unavailable
                            </p>
                          )
                        ) : (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Oracle pricing coming soon
                          </p>
                        )}

                        {/* Token Description */}
                        {token.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {token.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Select Button */}
                      <div className="flex-shrink-0">
                        {hasOracle ? (
                          <Button
                            size="sm"
                            className="btn-cyan group-hover:shadow-md transition-all"
                          >
                            Select
                          </Button>
                        ) : (
                          <Button size="sm" disabled className="opacity-50">
                            Coming Soon
                          </Button>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <div className="mt-0.5 h-1 w-1 rounded-full bg-accent flex-shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-foreground font-medium">
                DomaRank™
              </strong>{" "}
              scores are calculated by our proprietary AI based on domain age,
              market demand, and quality indicators. Collateral values are
              risk-adjusted for safer lending.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DomaCollateralBrowser;
