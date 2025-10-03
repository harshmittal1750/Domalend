import { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  Lock,
  Users,
  CheckCircle,
  AlertTriangle,
  Wallet,
  FileText,
  Clock,
  Brain,
  Globe,
  Sparkles,
} from "lucide-react";

export default function HowItWorks() {
  const lendingSteps = [
    {
      step: 1,
      title: "Get Testnet ETH",
      description:
        "Bridge Sepolia ETH to Doma Testnet using the Doma Bridge for ultra-low gas fees.",
      icon: Wallet,
      color: "text-blue-500",
    },
    {
      step: 2,
      title: "Create Loan Offer",
      description:
        "Set your terms: lending amount, interest rate (5-25% APY), duration, and which collateral tokens you'll accept (domain tokens or standard tokens).",
      icon: FileText,
      color: "text-green-500",
    },
    {
      step: 3,
      title: "Wait for Borrowers",
      description:
        "Your offer appears in the marketplace. Borrowers with domain tokens can accept your terms, and DomaRank Oracle automatically values their collateral.",
      icon: Users,
      color: "text-purple-500",
    },
    {
      step: 4,
      title: "Earn Interest",
      description:
        "Earn competitive interest as borrowers repay. If liquidated, you receive valuable domain tokens worth more than your loan.",
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  const borrowingSteps = [
    {
      step: 1,
      title: "Buy Domain Tokens",
      description:
        "Visit Mizu DEX to purchase fractionalized tokens of premium domains like software.ai, crypto.ai, or nft.io.",
      icon: Globe,
      color: "text-blue-500",
    },
    {
      step: 2,
      title: "Browse Loan Offers",
      description:
        "Find loan offers that accept your domain tokens as collateral. Our DomaRank AI Oracle values your tokens in real-time.",
      icon: Brain,
      color: "text-green-500",
    },
    {
      step: 3,
      title: "Lock Collateral & Borrow",
      description:
        "Lock your domain tokens as collateral and receive stablecoins instantly. Your tokens are secured by smart contracts.",
      icon: Zap,
      color: "text-purple-500",
    },
    {
      step: 4,
      title: "Repay & Reclaim",
      description:
        "Repay your loan to unlock your domain tokens. You can also add collateral or make partial repayments anytime.",
      icon: CheckCircle,
      color: "text-primary",
    },
  ];

  const features = [
    {
      title: "DomaRank AI Oracle",
      description:
        "World's first AI-powered oracle designed specifically for domain token valuation. Analyzes TLD quality, keywords, age, social presence, and market liquidity.",
      icon: Brain,
    },
    {
      title: "Fractionalized Domain Collateral",
      description:
        "Use premium domain tokens from Doma Protocol as collateral. Trade domains like software.ai on Mizu DEX, then borrow against your position.",
      icon: Globe,
    },
    {
      title: "Real-Time Price Updates",
      description:
        "Oracle prices update every 10 minutes from live Mizu DEX data and Doma's GraphQL Subgraph. Custom event indexer triggers instant updates on new loans.",
      icon: TrendingUp,
    },
    {
      title: "Dual Oracle System",
      description:
        "DomaRank Oracle for domain tokens + Chainlink/DIA oracles for standard tokens. Best-in-class pricing for all collateral types.",
      icon: Sparkles,
    },
    {
      title: "Rich Domain Metadata",
      description:
        "Deep Doma Subgraph integration displays domain images, Twitter links, websites, fractionalization dates, and total supply for every token.",
      icon: FileText,
    },
    {
      title: "Lightning Fast Indexing",
      description:
        "Custom event indexer with 5-second polling delivers 95% faster updates than The Graph Protocol. Real-time loan dashboard and instant notifications.",
      icon: Zap,
    },
  ];

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <Badge variant="secondary" className="px-4 py-2">
            Complete Guide
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            How DomaLend Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The world&apos;s first lending protocol for fractionalized domain
            tokens. Learn how to unlock liquidity from premium Doma domains
            using our revolutionary DomaRank AI Oracle for intelligent, fair
            valuations.
          </p>
        </section>

        {/* Lending Process */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              For Lenders: Earn Interest on Your Crypto
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Lend stablecoins secured by fractionalized domain tokens and earn
              competitive interest rates
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {lendingSteps.map((step, index) => (
              <Card
                key={step.step}
                className="relative border-border/50 hover:border-primary/50 transition-colors"
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4`}
                  >
                    <step.icon className={`h-6 w-6 ${step.color}`} />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Step {step.step}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    {step.description}
                  </p>
                </CardContent>
                {index < lendingSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Borrowing Process */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              For Borrowers: Unlock Liquidity from Domain Tokens
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Use your fractionalized Doma domain tokens as collateral to borrow
              stablecoins instantly
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {borrowingSteps.map((step, index) => (
              <Card
                key={step.step}
                className="relative border-border/50 hover:border-primary/50 transition-colors"
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4`}
                  >
                    <step.icon className={`h-6 w-6 ${step.color}`} />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Step {step.step}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    {step.description}
                  </p>
                </CardContent>
                {index < borrowingSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Revolutionary Features Powered by Doma
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              First-of-its-kind technology combining AI-powered domain valuation
              with deep Doma Protocol integration
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-border/50 hover:border-primary/50 transition-colors"
              >
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-6 py-12 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Unlock Your Domain&apos;s Value?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join the revolution in domain-backed DeFi. Start lending or borrow
            against your premium domain tokens today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8">
              <Link href="/domarank">
                <Brain className="mr-2 h-4 w-4" />
                Explore DomaRank AI
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link href="/offers">
                <Globe className="mr-2 h-4 w-4" />
                Browse Loans
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
