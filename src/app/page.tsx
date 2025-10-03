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
  Brain,
  BarChart3,
  Activity,
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
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          {/* Organic Background Shapes */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl"
              style={{
                clipPath:
                  "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
              }}
            />
          </div>

          <div className="text-center relative z-10 px-4">
            {/* Hero Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/20 px-6 py-3 rounded-full text-sm font-medium mb-8">
              <Brain className="h-4 w-4 text-primary" />
              <span>Powered by DomaRank AI Oracle</span>
              <span className="text-primary">•</span>
              <span className="text-muted-foreground">
                Built on Doma Testnet
              </span>
            </div>

            {/* Main Heading */}
            <div className="space-y-8 mb-12 max-w-5xl mx-auto">
              <h1 className="text-6xl md:text-8xl font-bold text-foreground leading-[1.1] tracking-tight">
                Unlock Liquidity from{" "}
                <span className="text-primary inline-block">
                  Your Doma Domains
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                The first lending protocol that accepts{" "}
                <span className="text-foreground font-semibold">
                  fractionalized domain tokens
                </span>{" "}
                as collateral
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              {!isConnected ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">
                      Connect your wallet to get started
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Secure
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Trustless
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Lightning Fast
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <Link href="/create">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 px-10 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <PlusCircle className="h-5 w-5 mr-2" />
                      Create Loan Offer
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/offers">
                    <Button
                      size="lg"
                      variant="outline"
                      className="px-10 py-6 text-lg font-semibold rounded-full hover:bg-accent transition-all duration-300"
                    >
                      <List className="h-5 w-5 mr-2" />
                      Browse Offers
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        {isConnected && (
          <section className="py-24  px-4 relative">
            <div className="absolute inset-0 bg-primary/5 rounded-[60px] mx-4" />
            <div className="relative z-10 max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  Your Portfolio
                </h2>
                <p className="text-muted-foreground text-lg">
                  Track your activity
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="group relative">
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-3xl" />
                      <div className="relative p-8 text-center space-y-4">
                        <div
                          className={`inline-flex p-4 rounded-2xl ${stat.bgColor}`}
                        >
                          <Icon className={`h-8 w-8 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-5xl font-bold mb-2">
                            {stat.value}
                          </p>
                          <p className="font-semibold text-foreground text-lg">
                            {stat.label}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {stat.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-24 px-4 relative overflow-hidden">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 border-2 border-primary rounded-full" />
            <div className="absolute bottom-0 left-0 w-96 h-96 border-2 border-primary rounded-full" />
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Why Choose DomaLend?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The revolutionary way to unlock value from your fractionalized
                domain token portfolio
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="group relative">
                    <div className="text-center space-y-6">
                      <div className="inline-flex p-6 rounded-3xl bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300">
                        <Icon className="h-12 w-12 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-4">
                          {feature.title}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* DomaRank Showcase Section */}
        <section className="py-32 px-4 relative overflow-hidden bg-primary/5">
          {/* Organic Shapes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-3xl"
              style={{
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/10 blur-3xl"
              style={{ borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%" }}
            />
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm px-6 py-3 rounded-full mb-8 border border-primary/20">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Revolutionary AI Oracle
                </span>
              </div>
              <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                Powered by <span className="text-primary">DomaRank</span>
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                World's first AI-powered oracle for domain token valuation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
              {[
                {
                  icon: Brain,
                  title: "AI-Powered Analysis",
                  description:
                    "Machine learning algorithms evaluate 6 key metrics including domain length, social presence, and market activity",
                },
                {
                  icon: Activity,
                  title: "Real-Time Updates",
                  description:
                    "Prices updated every 10 minutes with live market data from CoinGecko and Doma Protocol",
                },
                {
                  icon: BarChart3,
                  title: "Multi-Factor Scoring",
                  description:
                    "DomaRank score (0-100) combines domain quality, liquidity, supply, and launch metrics",
                },
              ].map((feature, index) => (
                <div key={index} className="text-center space-y-4">
                  <div className="inline-flex p-5 rounded-full bg-background/80 backdrop-blur-sm border border-primary/20">
                    <feature.icon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* DomaRank CTA */}
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-background/80 backdrop-blur-sm border border-primary/20 rounded-[40px] p-12">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-8">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-6">
                  Discover the DomaRank Revolution
                </h3>
                <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                  Learn how our groundbreaking AI oracle technology is
                  transforming DeFi lending
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/domarank">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-lg px-10 py-6 rounded-full"
                    >
                      <Brain className="mr-2 h-5 w-5" />
                      Explore DomaRank
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/offers">
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg px-10 py-6 rounded-full"
                    >
                      <TrendingUp className="mr-2 h-5 w-5" />
                      See Live Prices
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started - Prerequisites */}
        <section className="py-24 px-4 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Get Started in Minutes
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to start lending or borrowing
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Step 1: Get Testnet ETH */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-primary/10 rounded-[30px] blur-xl group-hover:bg-primary/20 transition-colors duration-300" />
                <div className="relative bg-background border border-primary/20 rounded-[30px] p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="inline-flex p-4 rounded-2xl bg-primary/10">
                      <Wallet className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-primary px-4 py-1 bg-primary/10 rounded-full">
                      Step 1
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Get Testnet ETH</h3>
                  <p className="text-muted-foreground mb-6">
                    Bridge Sepolia ETH to Doma Testnet for gas fees
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="text-primary font-bold">→</span>
                      Get Sepolia ETH from any faucet
                    </li>
                    <li className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="text-primary font-bold">→</span>
                      Connect wallet to Doma Bridge
                    </li>
                    <li className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="text-primary font-bold">→</span>
                      Bridge ETH to Doma Testnet
                    </li>
                  </ul>
                  <a
                    href="https://bridge-testnet.doma.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full bg-primary hover:bg-primary/90 rounded-full">
                      <Zap className="h-4 w-4 mr-2" />
                      Open Doma Bridge
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </div>

              {/* Step 2: Buy Domain Tokens */}
              <Card className="border-2 border-primary/20 relative group hover:border-primary/40 transition-all duration-300">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary/10 border-primary/30 font-bold">
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
                    <Button className="w-full bg-primary hover:bg-primary/90 group-hover:scale-105 transition-transform duration-300">
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
              <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between flex-wrap gap-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <CheckCircle className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className="bg-primary/10 border-primary/30 font-bold">
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
                        <Button
                          size="lg"
                          className="bg-primary hover:bg-primary/90"
                        >
                          <PlusCircle className="h-5 w-5 mr-2" />
                          Create Loan Offer
                        </Button>
                      </Link>
                      <Link href="/offers">
                        <Button size="lg" variant="outline">
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
              <Card className="border hover:border-primary/50 transition-all duration-300">
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

              <Card className="border hover:border-primary/50 transition-all duration-300">
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
            <Card className="border">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Brain className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">
                        DomaRank AI Oracle
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Revolutionary AI-Powered Valuation
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Our groundbreaking AI oracle technology evaluates domain
                    tokens using advanced machine learning algorithms and
                    real-time market data to ensure fair, accurate, and
                    risk-adjusted valuations.
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
                <div className="p-8 bg-muted/30 flex items-center justify-center">
                  <div className="text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 mb-2">
                      <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold mb-2 text-foreground">
                        Experience AI-Powered Lending
                      </h4>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        Discover how DomaRank AI Oracle revolutionizes DeFi
                        lending with intelligent pricing
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Link href="/domarank">
                        <Button className="bg-primary hover:bg-primary/90 w-full">
                          <Brain className="mr-2 h-4 w-4" />
                          Learn About DomaRank
                        </Button>
                      </Link>
                      {!isConnected && (
                        <Button variant="outline" className="w-full">
                          Connect Wallet to Start
                        </Button>
                      )}
                    </div>
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
                <Card className="border hover:border-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer group">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mx-auto w-fit group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="h-8 w-8 text-primary" />
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
                <Card className="border hover:border-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer group">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mx-auto w-fit group-hover:scale-110 transition-transform duration-300">
                      <HelpCircle className="h-8 w-8 text-primary" />
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
              <Card className="border">
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
                          <Card className="border hover:border-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer group">
                            <CardContent className="p-6 text-center space-y-4">
                              <div
                                className={`p-3 rounded-xl ${action.bgColor} mx-auto w-fit group-hover:scale-110 transition-transform duration-300`}
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
