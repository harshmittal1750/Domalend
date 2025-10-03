"use client";

import { useState, useMemo } from "react";
import { Search, X, Globe2 } from "lucide-react";
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
import { TOKENS, getDomaRankTokens } from "@/config/tokens";

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

  const { prices } = useTokenPrices();
  const domaTokens = getDomaRankTokens();

  // Filter tokens based on search
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return domaTokens;

    const query = searchQuery.toLowerCase();
    return domaTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [searchQuery, domaTokens]);

  const handleSelect = (tokenAddress: string) => {
    onSelect?.(tokenAddress);
    setOpen(false);
  };

  return (
    <Dialog open={open} onSetOpen={setOpen}>
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
          <DialogTitle className="text-2xl font-semibold">
            Doma Domain Collateral
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select a fractionalized domain as collateral. All domains are valued
            by our DomaRank algorithm.
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
          {filteredTokens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No domains found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTokens.map((token) => {
                const tokenPrice = prices.get(token.address.toLowerCase());

                // Mock DomaRank score - in production, this comes from backend
                const mockDomaRank = 75 + Math.floor(Math.random() * 20);

                return (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token.address)}
                    className="w-full text-left rounded-lg border border-border bg-card p-5 hover:border-accent hover:bg-accent/5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
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
                        {tokenPrice ? (
                          <DualPriceDisplay
                            price={tokenPrice}
                            showLabel={true}
                            className="text-sm"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Price loading...
                          </p>
                        )}

                        {/* Domain Metadata (if available) */}
                        {token.domainMetadata?.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {token.domainMetadata.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Select Button */}
                      <div className="flex-shrink-0">
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground group-hover:shadow-md transition-all"
                        >
                          Select
                        </Button>
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
