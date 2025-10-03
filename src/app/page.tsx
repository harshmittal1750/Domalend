"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useP2PLending } from "@/hooks/useP2PLending";
import {
  PlusCircle,
  List,
  User,
  Shield,
  TrendingUp,
  Clock,
  Wallet,
  Zap,
  Lock,
  Globe,
  ArrowRight,
  Sparkles,
  CheckCircle,
  HelpCircle,
  BookOpen,
} from "lucide-react";

export default function Home() {
  const { isConnected, activeLoanOfferIds, lenderLoans, borrowerLoans } =
    useP2PLending();

  const stats = [
    {
      icon: List,
      label: "Active Offers",
      value: activeLoanOfferIds?.length || 0,
      description: "Available loan offers",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: TrendingUp,
      label: "Your Loans as Lender",
      value: lenderLoans?.length || 0,
      description: "Loans you've created",
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      icon: Clock,
      label: "Your Loans as Borrower",
      value: borrowerLoans?.length || 0,
      description: "Loans you've accepted",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
  ];

  const features = [
    {
      icon: Globe,
      title: "Fractionalized Domain Tokens",
      description:
        "Use fractionalized domain tokens from premium Doma domains as collateral. Trade on Mizu DEX, then borrow against your position.",
      color: "text-blue-600",
    },
    {
      icon: Sparkles,
      title: "Intelligent Algorithmic Valuation",
      description:
        "Our advanced DomaRank algorithm analyzes domain quality, TLD premium, keywords, and market data to provide fair, real-time valuations.",
      color: "text-purple-600",
    },
    {
      icon: Shield,
      title: "Secure & Trustless",
      description:
        "Smart contracts automatically manage collateral, liquidations, and repayments. Lenders are protected by over-collateralization.",
      color: "text-green-600",
    },
  ];

  const benefits = [
    "Intelligent algorithmic domain valuation (DomaRank scoring)",
    "Premium TLD scoring (.com, .io, .ai get top scores)",
    "Keyword analysis (crypto, nft, defi domains valued higher)",
    "Real-time oracle price feeds updated every 10 minutes",
    "Dynamic fractionalized token collateral management",
    "Risk-adjusted valuations protect both parties",
    "Partial repayments to improve loan health",
    "Automated liquidation if collateral value drops",
  ];

  return (
    <>
      <div className="relative">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="text-center relative z-10">
            {/* Hero Badge */}
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 border border-primary/20">
              <Sparkles className="h-4 w-4" />
              <span>Powered by DomaRank Algorithm • Built on Doma Testnet</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-6 mb-12">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-tight">
                Unlock Liquidity from
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Your Doma Domains
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                The first lending protocol that accepts fractionalized Doma
                domain tokens as collateral. Get instant loans using your
                valuable domains, or lend stablecoins backed by premium domain
                assets valued algorithmically.
              </p>
            </div>

            {/* CTA Buttons */}
            {!isConnected ? (
              <div className="space-y-6">
                <div className="glass px-6 py-4 rounded-2xl inline-block">
                  <p className="text-muted-foreground mb-4">
                    Connect your wallet to get started
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-primary">
                    <Lock className="h-4 w-4" />
                    <span>Secure • Trustless • Transparent</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create">
                  <Button
                    size="lg"
                    className="btn-premium px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Create Loan Offer
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/offers">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-4 text-lg font-semibold rounded-2xl glass hover:bg-accent/50 transition-all duration-300"
                  >
                    <List className="h-5 w-5 mr-2" />
                    Browse Offers
                  </Button>
                </Link>
              </div>
            )}

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">Decentralized</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Audited (soon)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Lightning Fast</span>
              </div>
            </div>
          </div>

          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
          </div>
        </section>

        {/* Stats Section */}
        {isConnected && (
          <section className="py-16">
            <div>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">
                  Your Portfolio Overview
                </h2>
                <p className="text-muted-foreground text-lg">
                  Track your lending and borrowing activity
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card
                      key={index}
                      className="luxury-shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-2xl ${stat.bgColor}`}>
                            <Icon className={`h-6 w-6 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-3xl font-bold">{stat.value}</p>
                            <p className="font-semibold text-foreground">
                              {stat.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {stat.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-16">
          <div>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6">Why Choose DomaLend?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The revolutionary way to unlock value from your fractionalized
                domain token portfolio
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="luxury-shadow hover:luxury-shadow-lg transition-all duration-300 group"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 rounded-xl bg-background/50 group-hover:scale-110 transition-transform duration-300">
                          <Icon className={`h-6 w-6 ${feature.color}`} />
                        </div>
                        <CardTitle className="text-xl">
                          {feature.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Getting Started - Prerequisites */}
        <section className="py-16 bg-gradient-to-b from-background to-primary/5">
          <div>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6">
                Get Started in Minutes
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Follow these simple steps to start lending or borrowing on
                DomaLend
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Step 1: Get Testnet ETH */}
              <Card className="luxury-shadow-lg border-2 border-primary/20 relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary/20 text-primary border-primary/30 font-bold">
                    Step 1
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                      <Wallet className="h-6 w-6 text-blue-600" />
                    </div>
                    <span>Get Testnet ETH</span>
                  </CardTitle>
                  <CardDescription>
                    Bridge Sepolia ETH to Doma Testnet for gas fees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">
                          1
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Get Sepolia ETH from any Sepolia faucet
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">
                          2
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Visit the Doma Bridge and connect your wallet
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">
                          3
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Bridge ETH from Sepolia to Doma Testnet
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://bridge-testnet.doma.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full btn-premium group-hover:scale-105 transition-transform duration-300">
                      <Zap className="h-4 w-4 mr-2" />
                      Open Doma Bridge
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                </CardContent>
              </Card>

              {/* Step 2: Buy Domain Tokens */}
              <Card className="luxury-shadow-lg border-2 border-purple-500/20 relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30 font-bold">
                    Step 2
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/20">
                      <Globe className="h-6 w-6 text-purple-600" />
                    </div>
                    <span>Get Domain Tokens</span>
                  </CardTitle>
                  <CardDescription>
                    Buy fractionalized domain tokens on Mizu DEX
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-purple-600">
                          1
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Visit Mizu - the DeFi marketplace for Doma domains
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-purple-600">
                          2
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Browse premium domains (.com, .io, .ai, .crypto)
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-purple-600">
                          3
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Buy fractionalized domain tokens to use as collateral
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://mizu-testnet.doma.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 group-hover:scale-105 transition-transform duration-300">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Explore Mizu DEX
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>

            {/* Step 3 - Use DomaLend */}
            <div className="mt-8 max-w-4xl mx-auto">
              <Card className="luxury-shadow-lg border-2 border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between flex-wrap gap-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-4 rounded-xl bg-green-100 dark:bg-green-900/20">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 font-bold">
                            Step 3
                          </Badge>
                          <h3 className="text-2xl font-bold">Ready to Go!</h3>
                        </div>
                        <p className="text-muted-foreground">
                          You now have testnet ETH and domain tokens. Start
                          lending or borrowing on DomaLend!
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href="/create">
                        <Button size="lg" className="btn-premium">
                          <PlusCircle className="h-5 w-5 mr-2" />
                          Create Loan Offer
                        </Button>
                      </Link>
                      <Link href="/offers">
                        <Button size="lg" variant="outline" className="glass">
                          <List className="h-5 w-5 mr-2" />
                          Browse Loans
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6">How It Works</h2>
              <p className="text-xl text-muted-foreground">
                Unlock value from Doma domains in three simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="luxury-shadow-lg border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/20">
                      <Wallet className="h-6 w-6 text-green-600" />
                    </div>
                    <span>For Lenders (Earn Interest)</span>
                  </CardTitle>
                  <CardDescription>
                    Lend stablecoins secured by fractionalized domain tokens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    "Create a loan offer specifying amount, interest rate, and acceptable domain token collateral",
                    "Set your risk parameters: minimum collateral ratio and liquidation threshold",
                    "Your stablecoins are escrowed and matched with borrowers' domain tokens",
                    "Earn competitive interest as borrowers repay, or claim valuable domains if liquidated",
                  ].map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Badge
                        variant="outline"
                        className="mt-1 w-6 h-6 flex items-center justify-center p-0 rounded-full bg-green-100 dark:bg-green-900/20 border-green-300"
                      >
                        {index + 1}
                      </Badge>
                      <p className="text-muted-foreground leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="luxury-shadow-lg border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                      <Globe className="h-6 w-6 text-blue-600" />
                    </div>
                    <span>For Borrowers (Unlock Liquidity)</span>
                  </CardTitle>
                  <CardDescription>
                    Get instant loans using your fractionalized Doma domain
                    tokens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    "Browse available loan offers and find terms that work for you",
                    "Our intelligent pricing algorithm evaluates your fractionalized domain token based on TLD quality, keywords, and market data",
                    "Lock your domain tokens as collateral and receive stablecoins instantly",
                    "Add more domains or make partial repayments to maintain healthy loan-to-value ratios",
                    "Repay the loan balance to unlock your domain tokens automatically",
                  ].map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Badge
                        variant="outline"
                        className="mt-1 w-6 h-6 flex items-center justify-center p-0 rounded-full bg-blue-100 dark:bg-blue-900/20 border-blue-300"
                      >
                        {index + 1}
                      </Badge>
                      <p className="text-muted-foreground leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16">
          <div>
            <Card className="luxury-shadow-lg overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <span>Powered by DomaRank Algorithm</span>
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Our intelligent pricing algorithm evaluates domains using
                    multiple factors to ensure fair, risk-adjusted valuations
                  </p>
                  <div className="space-y-3">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-sm leading-relaxed">
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-8 bg-gradient-to-br from-primary/5 to-purple-500/5 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">
                      Unlock Your Domain Value
                    </h4>
                    <p className="text-muted-foreground mb-6">
                      Start lending or borrowing with fractionalized Doma domain
                      tokens today
                    </p>
                    {!isConnected && (
                      <Button className="btn-premium">
                        Connect Wallet to Start
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Help & Resources Section */}
        <section className="py-16">
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Need Help Getting Started?
              </h2>
              <p className="text-muted-foreground text-lg">
                Learn how to leverage your Doma domains on DomaLend
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/how-it-works">
                <Card className="luxury-shadow hover:luxury-shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/20 mx-auto w-fit group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        How It Works
                      </h3>
                      <p className="text-muted-foreground">
                        Learn how to use fractionalized Doma domain tokens as
                        collateral for loans
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 mx-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/faq">
                <Card className="luxury-shadow hover:luxury-shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-100 dark:bg-amber-900/20 mx-auto w-fit group-hover:scale-110 transition-transform duration-300">
                      <HelpCircle className="h-8 w-8 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">FAQ</h3>
                      <p className="text-muted-foreground">
                        Find answers to common questions about our platform
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 mx-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        {isConnected && (
          <section className="py-16">
            <div>
              <Card className="luxury-shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Quick Actions</CardTitle>
                  <CardDescription className="text-lg">
                    Start lending or unlock liquidity from your Doma domains
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        href: "/create",
                        icon: PlusCircle,
                        title: "Create Loan Offer",
                        description:
                          "Lend stablecoins secured by fractionalized domain tokens",
                        color: "text-green-600",
                        bgColor: "bg-green-100 dark:bg-green-900/20",
                      },
                      {
                        href: "/offers",
                        icon: Globe,
                        title: "Borrow with Domains",
                        description: "Use your Doma domains as collateral",
                        color: "text-blue-600",
                        bgColor: "bg-blue-100 dark:bg-blue-900/20",
                      },
                      {
                        href: "/my-loans",
                        icon: User,
                        title: "My Loans",
                        description: "Manage your loans and domain collateral",
                        color: "text-purple-600",
                        bgColor: "bg-purple-100 dark:bg-purple-900/20",
                      },
                    ].map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <Link key={index} href={action.href}>
                          <Card className="luxury-shadow hover:luxury-shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
                            <CardContent className="p-6 text-center space-y-4">
                              <div
                                className={`p-3 rounded-2xl ${action.bgColor} mx-auto w-fit group-hover:scale-110 transition-transform duration-300`}
                              >
                                <Icon className={`h-6 w-6 ${action.color}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">
                                  {action.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {action.description}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
