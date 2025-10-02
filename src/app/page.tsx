"use client";

import { generateFinancialProductSchema, StructuredData } from "@/lib/seo";

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

const financialProductSchema = generateFinancialProductSchema({
  name: "DreamLend P2P Crypto Lending",
  description:
    "Peer-to-peer cryptocurrency lending platform offering secure loans and high-yield earning opportunities",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://dreamlend.finance",
  provider: "DreamLend Finance",
  category: "Permissionless Lending/Borrowing",
  interestRate: "Up to 150% APY",
});

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
      icon: Shield,
      title: "Collateral-Backed Security",
      description:
        "Every loan is secured with collateral, providing institutional-grade protection for lenders against default risk.",
      color: "text-blue-600",
    },
    {
      icon: Zap,
      title: "Lightning-Fast Execution",
      description:
        "Built on Somnia L1 for near-instant transactions and minimal fees, making DeFi lending accessible to everyone.",
      color: "text-yellow-600",
    },
    {
      icon: TrendingUp,
      title: "Advanced Loan Management",
      description:
        "Add/remove collateral dynamically and make partial repayments to optimize your loan health and reduce interest costs.",
      color: "text-green-600",
    },
  ];

  const benefits = [
    "Trustless smart contract execution",
    "Real-time oracle price feeds",
    "Dynamic collateral management",
    "Partial repayment flexibility",
    "Automated liquidation protection",
    "Multi-token collateral support",
    "Flexible loan durations",
    "Transparent fee structure",
  ];

  return (
    <>
      <StructuredData data={financialProductSchema} />
      <div className="relative">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="text-center relative z-10">
            {/* Hero Badge */}
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 border border-primary/20">
              <Sparkles className="h-4 w-4" />
              <span>Built on Somnia L1 Testnet</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-6 mb-12">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-tight">
                The Future of
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Decentralized Lending
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Experience institutional-grade P2P lending with amazing UX.
                Create loan offers, access capital, and earn yield in a
                trustless, transparent environment.
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
              <h2 className="text-4xl font-bold mb-6">Why Choose DreamLend?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Built with institutional-grade security and luxury user
                experience in mind
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

        {/* How It Works */}
        <section className="py-16">
          <div>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6">How It Works</h2>
              <p className="text-xl text-muted-foreground">
                Simple, secure, and transparent lending process
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="luxury-shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/20">
                      <PlusCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <span>For Lenders</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    "Create a loan offer with your desired terms and collateral requirements",
                    "Your tokens are securely escrowed in audited smart contracts",
                    "Earn competitive interest when borrowers repay loans on time",
                  ].map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Badge
                        variant="outline"
                        className="mt-1 w-6 h-6 flex items-center justify-center p-0 rounded-full"
                      >
                        {index + 1}
                      </Badge>
                      <p className="text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="luxury-shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                      <List className="h-6 w-6 text-blue-600" />
                    </div>
                    <span>For Borrowers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    "Browse available loan offers and find terms that match your needs",
                    "Provide collateral and accept the loan in a single transaction",
                    "Manage your loan health by adding/removing collateral as needed",
                    "Make partial repayments to reduce interest and improve loan health",
                    "Repay the remaining balance to unlock your collateral",
                  ].map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Badge
                        variant="outline"
                        className="mt-1 w-6 h-6 flex items-center justify-center p-0 rounded-full"
                      >
                        {index + 1}
                      </Badge>
                      <p className="text-muted-foreground">{step}</p>
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
                  <h3 className="text-2xl font-bold mb-6">
                    Built for the Future
                  </h3>
                  <div className="space-y-3">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-8 bg-gradient-to-br from-primary/5 to-purple-500/5 flex items-center justify-center">
                  <div className="text-center">
                    <Wallet className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">
                      Ready to Start?
                    </h4>
                    <p className="text-muted-foreground mb-6">
                      Join the future of decentralized lending today
                    </p>
                    {!isConnected && (
                      <Button className="btn-premium">Connect Wallet</Button>
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
                Explore our resources to learn more about DreamLend
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
                        Step-by-step guide to lending and borrowing on DreamLend
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
                    Jump right into lending or borrowing on DreamLend
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        href: "/create",
                        icon: PlusCircle,
                        title: "Create Loan Offer",
                        description: "Lend your tokens and earn interest",
                        color: "text-green-600",
                        bgColor: "bg-green-100 dark:bg-green-900/20",
                      },
                      {
                        href: "/offers",
                        icon: List,
                        title: "Browse Offers",
                        description: "Find loans that match your needs",
                        color: "text-blue-600",
                        bgColor: "bg-blue-100 dark:bg-blue-900/20",
                      },
                      {
                        href: "/my-loans",
                        icon: User,
                        title: "My Loans",
                        description: "Manage your active loans",
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
