"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bitcoin, Globe2, ArrowRight, Shield, TrendingUp } from "lucide-react";

/**
 * Professional Hero Section - "Two-Lane Highway" Concept
 *
 * Clean, typography-forward design showing DomaLend's dual value proposition:
 * 1. Standard Crypto Collateral (left) - Stability & Trust
 * 2. Doma Domain Collateral (right) - Intelligence & Innovation
 *
 * Design: "Anti-AI" professional theme - no gimmicks, just clarity
 */
export function ProfessionalHero() {
  return (
    <section className="relative pt-16 pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Headline */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight">
            The Intelligent
            <br />
            Lending Protocol
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
            Safer lending for standard assets.{" "}
            <span className="text-accent font-medium">
              Smarter collateral for Doma domains.
            </span>
          </p>
        </div>

        {/* Two-Lane Highway - Side by side comparison */}
        <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-5xl mx-auto">
          {/* Left Lane: Standard Crypto */}
          <div className="relative rounded-lg border border-border bg-card p-8 space-y-6 hover:border-primary/30 transition-colors">
            <div className="space-y-3">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary">
                <Bitcoin className="h-6 w-6 text-foreground" />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-semibold text-foreground">
                Standard Crypto
              </h3>

              {/* Tag */}
              <Badge
                variant="outline"
                className="text-xs font-medium border-border text-muted-foreground"
              >
                Traditional Collateral
              </Badge>
            </div>

            {/* Features */}
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                <span>USDC, WBTC, and major cryptocurrencies</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                <span>Chainlink oracle pricing</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                <span>Proven stability and liquidity</span>
              </li>
            </ul>

            {/* Footer badge */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span className="font-medium uppercase tracking-wider">
                  Time-Tested Security
                </span>
              </div>
            </div>
          </div>

          {/* Right Lane: Doma Domains */}
          <div className="relative rounded-lg border-2 border-accent bg-card p-8 space-y-6">
            <div className="space-y-3">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent/10">
                <Globe2 className="h-6 w-6 text-accent" />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-semibold text-foreground">
                Doma Domains
              </h3>

              {/* Premium Tag */}
              <Badge className="text-xs font-medium bg-accent text-accent-foreground">
                AI-Verified Collateral
              </Badge>
            </div>

            {/* Features */}
            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                <span>Fractionalized domain names (.ai, .com, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                <span>DomaRank™ algorithmic pricing</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                <span>Unlock unique asset value</span>
              </li>
            </ul>

            {/* Footer badge */}
            <div className="pt-4 border-t border-accent/20">
              <div className="flex items-center gap-2 text-xs text-accent">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-medium uppercase tracking-wider">
                  Intelligent Valuation
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/offers">
            <Button
              size="lg"
              className="px-8 py-6 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              Explore the Marketplace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <Link href="/create">
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-base font-semibold border-border hover:bg-secondary transition-colors"
            >
              Create a Loan Offer
            </Button>
          </Link>
        </div>

        {/* Subtitle - Explains the value prop */}
        <div className="text-center mt-12 max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">
            DomaLend combines the{" "}
            <strong className="text-foreground font-medium">
              stability of traditional crypto lending
            </strong>{" "}
            with the{" "}
            <strong className="text-accent font-medium">
              innovation of algorithmic domain asset valuation
            </strong>
            . Two lanes. One intelligent protocol.
          </p>
        </div>
      </div>

      {/* Minimal Background Element - Subtle, not distracting */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-3xl" />
      </div>
    </section>
  );
}

export default ProfessionalHero;
