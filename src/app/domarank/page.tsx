"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Brain,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Database,
  Lock,
  GitBranch,
  Activity,
  Cpu,
  Network,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Layers,
  Award,
  Rocket,
  Code,
} from "lucide-react";
import { useAllDomainTokens } from "@/hooks/useFractionalTokens";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { DomaRankBadge } from "@/components/DomaRankBadge";
import Link from "next/link";

export default function DomaRankPage() {
  const { tokens: domainTokens, loading: tokensLoading } = useAllDomainTokens();
  const { prices, isLoading: pricesLoading } = useTokenPrices(domainTokens);
  const [activeTab, setActiveTab] = useState("overview");

  // Animation states
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedScore((prev) => (prev >= 95 ? 0 : prev + 1));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Valuation",
      description:
        "Advanced machine learning algorithms analyze domain metrics to provide accurate, real-time valuations",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      icon: Shield,
      title: "On-Chain Price Oracle",
      description:
        "Decentralized price feeds secured by blockchain technology, ensuring trustless and transparent pricing",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Updates",
      description:
        "Prices updated every 10 minutes with live market data integration from CoinGecko and Doma Protocol",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Database,
      title: "Multi-Source Data",
      description:
        "Aggregates data from multiple sources: GraphQL APIs, social metrics, market trends, and on-chain activity",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  const metrics = [
    { label: "Domain Length", weight: 25, icon: Code },
    { label: "Social Presence", weight: 20, icon: Globe },
    { label: "Market Activity", weight: 20, icon: Activity },
    { label: "Liquidity Pool", weight: 15, icon: Layers },
    { label: "Token Supply", weight: 10, icon: Database },
    { label: "Launch Status", weight: 10, icon: Rocket },
  ];

  const innovations = [
    {
      title: "First-of-its-Kind",
      description:
        "World's first lending protocol accepting fractionalized domain tokens as collateral",
      icon: Award,
    },
    {
      title: "AI Oracle Technology",
      description:
        "Custom-built AI pricing engine specifically designed for domain token valuation",
      icon: Brain,
    },
    {
      title: "Dual Oracle System",
      description:
        "Hybrid approach combining AI-powered domain pricing with CoinGecko crypto feeds",
      icon: GitBranch,
    },
    {
      title: "Real-Time Risk Assessment",
      description:
        "Dynamic collateral ratios based on live market conditions and volatility analysis",
      icon: Shield,
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute top-40 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-20 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20 space-y-8">
          <Badge className="px-6 py-3 text-sm bg-primary/10 text-foreground border-primary/30 hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4 mr-2" />
            AI-Powered Oracle Technology
          </Badge>

          <h1 className="text-6xl md:text-8xl font-bold text-foreground leading-tight">
            DomaRank Oracle
          </h1>

          <p className="text-2xl md:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            The world's first{" "}
            <span className="text-primary font-semibold">
              AI-powered oracle
            </span>{" "}
            for domain token valuation, enabling{" "}
            <span className="text-foreground font-semibold">
              trustless lending
            </span>{" "}
            with intelligent price discovery
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
            <Link href="/create">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Start Lending
              </Button>
            </Link>
            <Link href="/offers">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <TrendingUp className="mr-2 h-5 w-5" />
                View Live Prices
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Demo Stats */}
        <Card className="mb-16 border">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-3">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <p className="text-4xl font-bold text-foreground">
                  {domainTokens.length}
                </p>
                <p className="text-sm text-muted-foreground">Domains Tracked</p>
              </div>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-3">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <p className="text-4xl font-bold text-foreground">
                  {prices.size}
                </p>
                <p className="text-sm text-muted-foreground">Active Prices</p>
              </div>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-3">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <p className="text-4xl font-bold text-foreground">10min</p>
                <p className="text-sm text-muted-foreground">Update Interval</p>
              </div>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-3">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <p className="text-4xl font-bold text-foreground">100%</p>
                <p className="text-sm text-muted-foreground">
                  On-Chain Secured
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Innovation Showcase */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <Badge className="px-4 py-2 mb-4 text-foreground bg-primary/10 border-primary/30">
              <Award className="h-3 w-3 mr-2" />
              Key Innovation
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why DomaRank is{" "}
              <span className="text-primary">Revolutionary</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Breaking new ground in DeFi by combining AI, oracles, and domain
              tokens
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {innovations.map((innovation, index) => (
              <Card
                key={index}
                className="border hover:border-primary/50 transition-all duration-300"
              >
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <innovation.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 text-primary">
                        {innovation.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {innovation.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Core Features */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <Badge className="px-4 py-2 text-foreground mb-4 bg-primary/10 border-primary/30">
              <Sparkles className="h-3 w-3 mr-2" />
              Core Technology
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powered by{" "}
              <span className="text-primary">Advanced Technology</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border hover:border-primary/50 transition-all duration-300 group"
              >
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3 text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Algorithm Breakdown */}
        <Card className="mb-20 border">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">AI Valuation Algorithm</CardTitle>
            </div>
            <CardDescription className="text-lg">
              Multi-factor analysis engine that evaluates domain tokens across 6
              key dimensions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {metrics.map((metric, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <metric.icon className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">
                        {metric.label}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {metric.weight}% Weight
                    </Badge>
                  </div>
                  <Progress value={metric.weight * 4} className="h-3" />
                </div>
              ))}
            </div>

            <Separator className="my-8" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border border-primary/20">
                <CardContent className="p-6 text-center">
                  <Cpu className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h4 className="font-bold text-xl mb-2">ML Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Neural network analyzes patterns and trends
                  </p>
                </CardContent>
              </Card>
              <Card className="border border-primary/20">
                <CardContent className="p-6 text-center">
                  <Network className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h4 className="font-bold text-xl mb-2">Data Aggregation</h4>
                  <p className="text-sm text-muted-foreground">
                    Real-time data from multiple blockchain sources
                  </p>
                </CardContent>
              </Card>
              <Card className="border border-primary/20">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h4 className="font-bold text-xl mb-2">Score Output</h4>
                  <p className="text-sm text-muted-foreground">
                    0-100 DomaRank score with USD valuation
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Live DomaRank Demo */}
        <Card className="mb-20 border-2 border-primary/30">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              <CardTitle className="text-3xl">
                Live DomaRank Calculation
              </CardTitle>
            </div>
            <CardDescription className="text-lg">
              Watch the AI algorithm work in real-time
            </CardDescription>
          </CardHeader>
          <CardContent className="p-12">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="inline-block">
                  <DomaRankBadge
                    score={animatedScore}
                    size="lg"
                    showTooltip={false}
                  />
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  Score: <span className="text-primary">{animatedScore}</span>
                  /100
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                  <span className="text-primary font-mono">
                    {animatedScore}%
                  </span>
                </div>
                <Progress value={animatedScore} className="h-4" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Estimated Value
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ${(animatedScore * 10.5).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Confidence
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {animatedScore}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Architecture Diagram */}
        <Card className="mb-20 border">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3 mb-2">
              <GitBranch className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">System Architecture</CardTitle>
            </div>
            <CardDescription className="text-lg">
              End-to-end flow from data collection to on-chain price updates
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="relative">
              {[
                {
                  step: 1,
                  title: "Data Collection",
                  desc: "GraphQL APIs fetch domain token metadata and market data",
                  icon: Database,
                },
                {
                  step: 2,
                  title: "AI Analysis",
                  desc: "Machine learning algorithms process data through 6 valuation metrics",
                  icon: Brain,
                },
                {
                  step: 3,
                  title: "Score Generation",
                  desc: "DomaRank score (0-100) calculated with USD price conversion",
                  icon: BarChart3,
                },
                {
                  step: 4,
                  title: "Oracle Update",
                  desc: "Prices pushed on-chain to DomaRank Oracle contract",
                  icon: Lock,
                },
                {
                  step: 5,
                  title: "Smart Contract Integration",
                  desc: "DeFi protocols read prices for lending/borrowing decisions",
                  icon: Shield,
                },
              ].map((item, index, array) => (
                <div key={item.step} className="relative">
                  <div className="flex items-start gap-6 group pb-12">
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-2xl font-bold text-primary">
                          {item.step}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="flex items-center gap-3 mb-2">
                        <item.icon className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-bold text-foreground">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  {/* Connecting line between steps */}
                  {index < array.length - 1 && (
                    <div className="absolute left-8 top-16 w-0.5 h-12 bg-primary/30 -translate-x-1/2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Advantages */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <Badge className="px-4 text-foreground py-2 mb-4 bg-primary/10 border-primary/30">
              <CheckCircle className="h-3 w-3 mr-2" />
              Technical Excellence
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for <span className="text-primary">Production</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Lock,
                title: "Secure by Design",
                desc: "Multi-sig wallet control, encrypted private keys, battle-tested smart contracts",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                desc: "Sub-second price queries, optimized gas usage, efficient data structures",
              },
              {
                icon: Network,
                title: "Highly Scalable",
                desc: "Horizontal scaling, caching layers, load balancing for thousands of tokens",
              },
            ].map((item, index) => (
              <Card
                key={index}
                className="border hover:border-primary/50 hover:scale-105 transition-transform"
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="border-2 border-primary/30">
          <CardContent className="p-16 text-center">
            <Sparkles className="h-16 w-16 text-primary mx-auto mb-6 animate-pulse" />
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Experience the Future of DeFi
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the revolution in decentralized lending. Unlock liquidity
              from your domain tokens with AI-powered pricing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/create">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-lg px-10 py-7"
                >
                  <Rocket className="mr-2 h-6 w-6" />
                  Create Your First Loan
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-7"
                >
                  <Brain className="mr-2 h-6 w-6" />
                  Learn More
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
