"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Sparkles,
  Activity,
  Target,
  Zap,
  Eye,
  Loader2,
} from "lucide-react";
import { useP2PLending } from "@/hooks/useP2PLending";
import { useAllLoansWithStatus } from "@/hooks/useSubgraphQuery";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import {
  getTokenByAddress,
  getAllSupportedTokens,
  getAllSupportedTokensAsync,
} from "@/config/tokens";
import { DualPriceDisplay } from "@/components/DualPriceDisplay";
import { DomaRankBadge } from "@/components/DomaRankBadge";
import { TransactionModal } from "@/components/TransactionModal";
import { ethers } from "ethers";
import { LoanStatus } from "@/lib/contracts";

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;

  // Initialize token cache on mount (CRITICAL for domain token data)
  useEffect(() => {
    console.log("[LoanDetailPage] Initializing token cache...");
    getAllSupportedTokensAsync()
      .then((tokens) => {
        console.log(
          "[LoanDetailPage] Token cache initialized with",
          tokens.length,
          "tokens"
        );
      })
      .catch((error) => {
        console.error(
          "[LoanDetailPage] Failed to initialize token cache:",
          error
        );
      });
  }, []);

  const {
    acceptLoanOffer,
    cancelLoanOffer,
    transactionState,
    resetTransactionState,
    isConnected,
    address,
  } = useP2PLending();

  const { loans, loading: loansLoading } = useAllLoansWithStatus();
  const { prices, isLoading: pricesLoading } = useTokenPrices(
    getAllSupportedTokens()
  );

  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);

  // Find the specific loan
  const loan = useMemo(() => {
    return loans.find((l) => l.id.toString() === loanId);
  }, [loans, loanId]);

  const tokenInfo = loan ? getTokenByAddress(loan.tokenAddress) : null;
  const collateralInfo = loan
    ? getTokenByAddress(loan.collateralAddress)
    : null;

  // Get token prices with DomaRank scores
  const tokenPrice = loan ? prices.get(loan.tokenAddress.toLowerCase()) : null;
  const collateralPrice = loan
    ? prices.get(loan.collateralAddress.toLowerCase())
    : null;

  // Format loan data
  const loanData = useMemo(() => {
    if (!loan || !tokenInfo || !collateralInfo) return null;

    const formattedAmount = ethers.formatUnits(loan.amount, tokenInfo.decimals);
    const formattedCollateral = ethers.formatUnits(
      loan.collateralAmount,
      collateralInfo.decimals
    );

    const loanValueUSD = tokenPrice
      ? parseFloat(formattedAmount) * parseFloat(tokenPrice.priceUSD)
      : 0;
    const collateralValueUSD = collateralPrice
      ? parseFloat(formattedCollateral) * parseFloat(collateralPrice.priceUSD)
      : 0;

    const collateralRatio =
      loanValueUSD > 0 ? (collateralValueUSD / loanValueUSD) * 100 : 0;

    const interestRate = Number(loan.interestRate) / 100;
    const duration = Number(loan.duration) / (24 * 60 * 60);
    const totalInterest = (parseFloat(formattedAmount) * interestRate) / 100;
    const totalRepayment = parseFloat(formattedAmount) + totalInterest;
    const dailyInterest = totalInterest / duration;

    return {
      formattedAmount,
      formattedCollateral,
      loanValueUSD,
      collateralValueUSD,
      collateralRatio,
      interestRate,
      duration,
      totalInterest,
      totalRepayment,
      dailyInterest,
      tokenPrice: tokenPrice || undefined,
      collateralPrice: collateralPrice || undefined,
    };
  }, [loan, tokenInfo, collateralInfo, tokenPrice, collateralPrice]);

  const handleAccept = async () => {
    if (!loan || !address) return;

    if (loan.lender.toLowerCase() === address.toLowerCase()) {
      alert("You cannot accept your own loan offer");
      return;
    }

    try {
      await acceptLoanOffer(loan.id, loan);
    } catch (error) {
      console.error("Failed to accept loan:", error);
    }
  };

  const handleCancel = async () => {
    if (!loan || !address) return;

    if (loan.lender.toLowerCase() !== address.toLowerCase()) {
      alert("You can only cancel your own loan offers");
      return;
    }

    try {
      await cancelLoanOffer(loan.id);
    } catch (error) {
      console.error("Failed to cancel loan:", error);
    }
  };

  // Risk assessment
  const riskLevel = useMemo(() => {
    if (!loanData) return { level: "unknown", color: "gray", label: "Unknown" };

    const ratio = loanData.collateralRatio;
    if (ratio >= 180)
      return { level: "low", color: "green", label: "Low Risk", score: 90 };
    if (ratio >= 150)
      return {
        level: "medium",
        color: "yellow",
        label: "Medium Risk",
        score: 70,
      };
    if (ratio >= 120)
      return { level: "high", color: "orange", label: "High Risk", score: 50 };
    return {
      level: "very-high",
      color: "red",
      label: "Very High Risk",
      score: 30,
    };
  }, [loanData]);

  if (loansLoading || pricesLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 w-full lg:col-span-2" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!loan || !tokenInfo || !collateralInfo || !loanData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Loan not found or unable to load loan details.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isOwnLoan = loan.lender.toLowerCase() === address?.toLowerCase();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="glass">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Offers
        </Button>
        <Badge
          className={`px-4 py-2 text-sm ${
            loan.status === 0
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
              : "bg-gray-500/10 text-gray-600 border-gray-500/20"
          }`}
        >
          <Activity className="h-3 w-3 mr-1" />
          {loan.status === 0 ? "Available" : "Not Available"}
        </Badge>
      </div>

      {/* Hero Section */}
      <Card className="mb-8 luxury-shadow-lg glass gradient-cyan overflow-hidden">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Loan Token */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Loan Amount</span>
              </div>
              <div className="flex items-center gap-4">
                {tokenInfo.domainMetadata?.image && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-cyan-500/30">
                    <img
                      src={tokenInfo.domainMetadata.image}
                      alt={tokenInfo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-500 to-primary bg-clip-text text-transparent">
                    {parseFloat(loanData.formattedAmount).toFixed(4)}
                  </h1>
                  <p className="text-2xl font-semibold text-primary mt-1">
                    {tokenInfo.symbol}
                  </p>
                  <p className="text-lg text-green-600 dark:text-green-400 font-medium mt-1">
                    ${loanData.loanValueUSD.toFixed(2)} USD
                  </p>
                </div>
              </div>
              {tokenInfo.isDomainToken && tokenPrice?.domaRankScore && (
                <DomaRankBadge
                  score={tokenPrice.domaRankScore}
                  size="md"
                  showTooltip={true}
                />
              )}
            </div>

            {/* Collateral Required */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Collateral Required</span>
              </div>
              <div className="flex items-center gap-4">
                {collateralInfo.domainMetadata?.image && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-cyan-500/30">
                    <img
                      src={collateralInfo.domainMetadata.image}
                      alt={collateralInfo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-4xl font-bold text-foreground">
                    {parseFloat(loanData.formattedCollateral).toFixed(4)}
                  </h2>
                  <p className="text-2xl font-semibold text-primary mt-1">
                    {collateralInfo.symbol}
                  </p>
                  <p className="text-lg text-blue-600 dark:text-blue-400 font-medium mt-1">
                    ${loanData.collateralValueUSD.toFixed(2)} USD
                  </p>
                </div>
              </div>
              {collateralInfo.isDomainToken &&
                collateralPrice?.domaRankScore && (
                  <DomaRankBadge
                    score={collateralPrice.domaRankScore}
                    size="md"
                    showTooltip={true}
                  />
                )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border/50">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Interest APR</p>
              <p className="text-2xl font-bold text-cyan-500">
                {loanData.interestRate.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Duration</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(loanData.duration)} days
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Collateral Ratio
              </p>
              <p className="text-2xl font-bold text-primary">
                {loanData.collateralRatio.toFixed(0)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
              <p
                className={`text-2xl font-bold text-${riskLevel.color}-600 dark:text-${riskLevel.color}-400`}
              >
                {riskLevel.label.split(" ")[0]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Analysis */}
          <Card className="luxury-shadow-lg glass">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-500" />
                Loan Analysis
              </CardTitle>
              <CardDescription>
                Comprehensive breakdown of this loan offer
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Interest Breakdown */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-cyan-500" />
                  Interest & Repayment
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Interest
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {loanData.totalInterest.toFixed(4)} {tokenInfo.symbol}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      $
                      {(
                        loanData.totalInterest *
                        parseFloat(loanData.tokenPrice?.priceUSD || "0")
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Repayment
                    </p>
                    <p className="text-xl font-bold text-primary">
                      {loanData.totalRepayment.toFixed(4)} {tokenInfo.symbol}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      $
                      {(
                        loanData.totalRepayment *
                        parseFloat(loanData.tokenPrice?.priceUSD || "0")
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">
                      Daily Interest
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {loanData.dailyInterest.toFixed(6)} {tokenInfo.symbol}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">
                      Effective APR
                    </p>
                    <p className="text-lg font-semibold text-cyan-500">
                      {loanData.interestRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Price Information */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-cyan-500" />
                  Current Market Prices
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      {tokenInfo.symbol} Price
                    </p>
                    <DualPriceDisplay
                      price={loanData.tokenPrice}
                      showLabel={false}
                      className="text-sm"
                    />
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      {collateralInfo.symbol} Price
                    </p>
                    <DualPriceDisplay
                      price={loanData.collateralPrice}
                      showLabel={false}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Risk Assessment */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-500" />
                  Risk Assessment
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Risk Score</span>
                    <Badge
                      className={`bg-${riskLevel.color}-500/10 text-${riskLevel.color}-600 dark:text-${riskLevel.color}-400 border-${riskLevel.color}-500/20`}
                    >
                      {riskLevel.score}/100
                    </Badge>
                  </div>
                  <Progress value={riskLevel.score} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div>
                      <p className="text-green-600">Low (90+)</p>
                    </div>
                    <div>
                      <p className="text-yellow-600">Medium (70+)</p>
                    </div>
                    <div>
                      <p className="text-red-600">High (&lt;70)</p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Collateral Coverage
                      </span>
                      <span className="font-semibold">
                        {loanData.collateralRatio.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Loan-to-Value (LTV)
                      </span>
                      <span className="font-semibold">
                        {((100 / loanData.collateralRatio) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Volatility Tier
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {tokenInfo.volatilityTier} /{" "}
                        {collateralInfo.volatilityTier}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Loan Token Card */}
            <Card className="luxury-shadow glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4 text-cyan-500" />
                  Loan Token Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{tokenInfo.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Symbol</span>
                  <Badge variant="outline">{tokenInfo.symbol}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Category
                  </span>
                  <Badge variant="secondary">{tokenInfo.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Decimals
                  </span>
                  <span className="text-sm font-mono">
                    {tokenInfo.decimals}
                  </span>
                </div>
                {tokenInfo.description && (
                  <p className="text-xs text-muted-foreground mt-4 p-3 rounded-lg bg-muted/30">
                    {tokenInfo.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Collateral Token Card */}
            <Card className="luxury-shadow glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-4 w-4 text-cyan-500" />
                  Collateral Token Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">
                    {collateralInfo.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Symbol</span>
                  <Badge variant="outline">{collateralInfo.symbol}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Category
                  </span>
                  <Badge variant="secondary">{collateralInfo.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Decimals
                  </span>
                  <span className="text-sm font-mono">
                    {collateralInfo.decimals}
                  </span>
                </div>
                {collateralInfo.description && (
                  <p className="text-xs text-muted-foreground mt-4 p-3 rounded-lg bg-muted/30">
                    {collateralInfo.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card className="luxury-shadow-lg glass border-2 border-cyan-500/20 sticky top-4">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-cyan-500" />
                Take Action
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {isOwnLoan ? (
                <>
                  <Alert>
                    <Eye className="h-4 w-4" />
                    <AlertDescription>
                      This is your loan offer. You can cancel it if you no
                      longer want to lend.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={handleCancel}
                    disabled={
                      transactionState.isLoading ||
                      loan.status !== LoanStatus.Pending
                    }
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    {transactionState.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Cancel Offer"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-primary/10 border border-cyan-500/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-cyan-500 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-sm mb-1">
                            Ready to Accept?
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            You'll receive{" "}
                            <span className="font-semibold text-foreground">
                              {parseFloat(loanData.formattedAmount).toFixed(4)}{" "}
                              {tokenInfo.symbol}
                            </span>{" "}
                            instantly.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        You must provide{" "}
                        <span className="font-semibold">
                          {parseFloat(loanData.formattedCollateral).toFixed(4)}{" "}
                          {collateralInfo.symbol}
                        </span>{" "}
                        as collateral.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Button
                    onClick={handleAccept}
                    disabled={
                      transactionState.isLoading ||
                      loan.status !== LoanStatus.Pending ||
                      !isConnected
                    }
                    className="w-full btn-cyan"
                    size="lg"
                  >
                    {transactionState.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept Loan Offer
                      </>
                    )}
                  </Button>

                  {!isConnected && (
                    <p className="text-xs text-center text-muted-foreground">
                      Connect your wallet to accept this offer
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Loan Terms */}
          <Card className="luxury-shadow glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-4 w-4 text-cyan-500" />
                Loan Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Duration
                </span>
                <span className="text-sm font-semibold">
                  {Math.round(loanData.duration)} days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  Interest Rate
                </span>
                <span className="text-sm font-semibold text-cyan-500">
                  {loanData.interestRate.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  Min Collateral
                </span>
                <span className="text-sm font-semibold">
                  {loanData.collateralRatio.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Loan ID
                </span>
                <span className="text-sm font-mono">#{loanId}</span>
              </div>

              <Separator />

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">
                  Lender Address
                </p>
                <p className="text-xs font-mono text-foreground break-all">
                  {loan.lender}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="luxury-shadow glass border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>
                    Ensure you have sufficient collateral tokens in your wallet
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>
                    You must repay the loan within the specified duration
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>
                    Failure to repay may result in collateral liquidation
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>All prices are updated in real-time from oracles</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={transactionState.step !== "idle"}
        onClose={resetTransactionState}
        transactionState={transactionState}
        onReset={resetTransactionState}
        onViewLoans={() => {
          resetTransactionState();
          router.push("/my-loans");
        }}
        title="Accepting Loan Offer"
        successTitle="Loan Accepted!"
        successDescription="You have successfully accepted the loan offer! The funds have been transferred to your wallet."
        steps={{
          approval: {
            title: "Approve Collateral Token",
            description: "Allow the contract to use your collateral tokens",
            loadingText: "Waiting for wallet confirmation...",
            successText: "Collateral token approved successfully",
            errorText: "Failed to approve collateral token",
          },
          transaction: {
            title: "Accept Loan Offer",
            description: "Complete the loan acceptance transaction",
            loadingText: "Processing loan acceptance...",
            successText: "Loan offer accepted successfully!",
            errorText: "Failed to accept loan offer",
          },
        }}
      />
    </div>
  );
}
