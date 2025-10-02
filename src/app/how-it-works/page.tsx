import { Metadata } from "next";
import {
  generateSEOMetadata,
  generateBreadcrumbSchema,
  StructuredData,
} from "@/lib/seo";
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
} from "lucide-react";

export const metadata: Metadata = generateSEOMetadata({
  title: "How DreamLend Works - Complete Guide to P2P Crypto Lending",
  description:
    "Learn how DreamLend's P2P crypto lending platform works. Step-by-step guide to lending, borrowing, earning interest, and managing your crypto loans safely.",
  canonical: "/how-it-works",
  keywords: [
    "how crypto lending works",
    "P2P lending guide",
    "crypto loan process",
    "DeFi lending tutorial",
    "earn interest on crypto",
    "crypto collateral loans",
    "decentralized lending guide",
  ],
});

const breadcrumbSchema = generateBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "How It Works", url: "/how-it-works" },
]);

export default function HowItWorks() {
  const lendingSteps = [
    {
      step: 1,
      title: "Connect Your Wallet",
      description:
        "Connect your Web3 wallet to DreamLend Finance. We support MetaMask, WalletConnect, and other popular wallets.",
      icon: Wallet,
      color: "text-blue-500",
    },
    {
      step: 2,
      title: "Create Loan Offer",
      description:
        "Set your lending terms: loan amount, interest rate, duration, and accepted collateral tokens.",
      icon: FileText,
      color: "text-green-500",
    },
    {
      step: 3,
      title: "Wait for Borrowers",
      description:
        "Your loan offer appears in the marketplace. Borrowers can accept your terms and provide collateral.",
      icon: Users,
      color: "text-purple-500",
    },
    {
      step: 4,
      title: "Earn Interest",
      description:
        "Once accepted, your loan starts earning interest automatically. Track your earnings in real-time.",
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  const borrowingSteps = [
    {
      step: 1,
      title: "Browse Loan Offers",
      description:
        "Explore available loan offers with competitive rates and terms that match your needs.",
      icon: Users,
      color: "text-blue-500",
    },
    {
      step: 2,
      title: "Provide Collateral",
      description:
        "Deposit collateral tokens to secure your loan. Our system ensures fair collateral ratios.",
      icon: Shield,
      color: "text-green-500",
    },
    {
      step: 3,
      title: "Receive Loan",
      description:
        "Get your loan tokens instantly after collateral confirmation. Funds are available immediately.",
      icon: Zap,
      color: "text-purple-500",
    },
    {
      step: 4,
      title: "Repay & Reclaim",
      description:
        "Repay your loan plus interest before the deadline to reclaim your collateral tokens.",
      icon: CheckCircle,
      color: "text-primary",
    },
  ];

  const features = [
    {
      title: "Institutional-Grade Security",
      description:
        "Multi-signature wallets, smart contract audits, and advanced security protocols protect your assets.",
      icon: Shield,
    },
    {
      title: "Automated Liquidation Protection",
      description:
        "Smart contracts automatically manage liquidations to protect both lenders and borrowers.",
      icon: AlertTriangle,
    },
    {
      title: "Real-Time Oracle Pricing",
      description:
        "Fair market pricing powered by Chainlink oracles ensures accurate collateral valuations.",
      icon: TrendingUp,
    },
    {
      title: "Flexible Terms",
      description:
        "Choose from various loan durations, interest rates, and collateral options to suit your needs.",
      icon: Clock,
    },
    {
      title: "Transparent Fees",
      description:
        "No hidden fees. All costs are clearly displayed before you commit to any transaction.",
      icon: FileText,
    },
    {
      title: "Instant Settlement",
      description:
        "Built on Somnia L1 for fast, low-cost transactions with instant finality.",
      icon: Zap,
    },
  ];

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <Badge variant="secondary" className="px-4 py-2">
            Complete Guide
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            How DreamLend Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Learn how to lend, borrow, and earn with DreamLend Finance - the
            most secure P2P crypto lending platform. Follow our step-by-step
            guide to start earning up to 15% APY on your digital assets.
          </p>
        </section>

        {/* Lending Process */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              How to Lend & Earn Interest
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start earning passive income on your crypto assets in just 4
              simple steps
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
              How to Borrow Crypto
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get instant access to crypto loans using your digital assets as
              collateral
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
              Why Choose DreamLend Finance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Advanced features and security measures that make DreamLend the
              premier P2P crypto lending platform
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
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of users who are already earning and borrowing on
            DreamLend Finance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8">
              <Link href="/create">
                Start Lending
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link href="/offers">Browse Loans</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
