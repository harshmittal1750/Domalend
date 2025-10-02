"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useP2PLending } from "@/hooks/useP2PLending";
import { LoanStatus } from "@/lib/contracts";
import {
  useAllLoansWithStatus,
  ProcessedLoan,
  invalidateSubgraphCache,
} from "@/hooks/useSubgraphQuery";
import {
  useLivePriceComparison,
  LoanWithPriceComparison,
} from "@/hooks/useLivePriceComparison";
import { LoanHealthManager } from "@/components/LoanHealthManager";
import { PartialRepaymentManager } from "@/components/PartialRepaymentManager";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Calendar,
  Shield,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  Users,
  Target,
  Activity,
  ExternalLink,
  Copy,
  Eye,
  BarChart3,
  Coins,
  Timer,
  Zap,
} from "lucide-react";
import { ethers } from "ethers";
import { getTokenByAddress } from "@/config/tokens";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

interface LoanWithDetails extends LoanWithPriceComparison {
  formattedAmount: string;
  formattedCollateralAmount: string;
  formattedInterestRate: number;
  formattedDuration: number;
  formattedTotalRepayment: string;
  formattedInterest: string;
  statusText: string;
  isOverdue: boolean;
  timeRemaining: string;
  progressPercent: number;
  tokenInfo?: TokenInfo;
  collateralInfo?: TokenInfo;
  minCollateralRatioBPS: bigint;
  liquidationThresholdBPS: bigint;
  maxPriceStaleness: bigint;
  repaidAmount: bigint;
}

interface LoanDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function LoanDetailsPage({ params }: LoanDetailsPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const loanId = BigInt(resolvedParams.id);

  const {
    repayLoan,
    liquidateLoan,
    cancelLoanOffer,
    transactionState,
    isConnected,
    address,
    calculateTotalRepayment,
    calculateInterest,
    isLoanDefaulted,
    getLoanHealthFactor,
    getLoanRepaymentInfo,
  } = useP2PLending();

  // Use subgraph data to get all loans
  const {
    loans: allLoans,
    loading: isLoadingSubgraph,
    error: subgraphError,
  } = useAllLoansWithStatus();

  // Find the specific loan
  const loan = React.useMemo(() => {
    return allLoans.find((l) => l.id === loanId);
  }, [allLoans, loanId]);

  // Get live price comparison data for this specific loan
  const {
    loans: loansWithPrices,
    loading: isLoadingPrices,
    refreshPrices,
  } = useLivePriceComparison(loan ? [loan] : [], {
    refreshInterval: 60000, // 1 minute for individual loan
    enableAutoRefresh: true,
  });

  const loanWithPrices = loansWithPrices[0];

  // Additional loan data states
  const [healthData, setHealthData] = useState<{
    currentRatio: bigint;
    priceStale: boolean;
  } | null>(null);

  const [repaymentInfo, setRepaymentInfo] = useState<{
    totalOwed: bigint;
    repaidAmount: bigint;
    remainingAmount: bigint;
    interestAccrued: bigint;
  } | null>(null);

  const [selectedAction, setSelectedAction] = useState<
    "repay" | "liquidate" | "cancel" | null
  >(null);
  const [showStuckMessage, setShowStuckMessage] = useState(false);

  // Format loan details for display
  const formatLoanDetails = useCallback(
    (loan: LoanWithPriceComparison): LoanWithDetails => {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const interest = calculateInterest(loan, currentTime);
      const totalRepayment = calculateTotalRepayment(loan, currentTime);
      const isOverdue = isLoanDefaulted(loan, currentTime);

      // Get token info from config
      const tokenInfo = getTokenByAddress(loan.tokenAddress);
      const collateralInfo = getTokenByAddress(loan.collateralAddress);

      // Calculate time remaining
      let timeRemaining = "N/A";
      let progressPercent = 0;

      if (loan.status === LoanStatus.Active) {
        const endTime = loan.startTime + loan.duration;
        const timeLeft = endTime - currentTime;

        if (timeLeft > 0) {
          const days = Number(timeLeft) / (24 * 60 * 60);
          const hours = (Number(timeLeft) % (24 * 60 * 60)) / (60 * 60);

          if (days >= 1) {
            timeRemaining = `${Math.floor(days)}d ${Math.floor(hours)}h`;
          } else {
            timeRemaining = `${Math.floor(hours)}h ${Math.floor((Number(timeLeft) % (60 * 60)) / 60)}m`;
          }

          progressPercent = Math.min(
            100,
            (Number(currentTime - loan.startTime) / Number(loan.duration)) * 100
          );
        } else {
          timeRemaining = "Overdue";
          progressPercent = 100;
        }
      }

      // Format amounts using correct decimals
      const formattedAmount = tokenInfo
        ? ethers.formatUnits(loan.amount, tokenInfo.decimals)
        : ethers.formatEther(loan.amount);

      const formattedCollateralAmount = collateralInfo
        ? ethers.formatUnits(loan.collateralAmount, collateralInfo.decimals)
        : ethers.formatEther(loan.collateralAmount);

      const formattedTotalRepayment = tokenInfo
        ? ethers.formatUnits(totalRepayment, tokenInfo.decimals)
        : ethers.formatEther(totalRepayment);

      const formattedInterest = tokenInfo
        ? ethers.formatUnits(interest, tokenInfo.decimals)
        : ethers.formatEther(interest);

      return {
        ...loan,
        formattedAmount,
        formattedCollateralAmount,
        formattedInterestRate: Number(loan.interestRate) / 100,
        formattedDuration: Number(loan.duration) / (24 * 60 * 60),
        formattedTotalRepayment,
        formattedInterest,
        statusText: ["Pending", "Active", "Repaid", "Defaulted", "Cancelled"][
          loan.status
        ],
        isOverdue,
        timeRemaining,
        progressPercent,
        tokenInfo: tokenInfo || undefined,
        collateralInfo: collateralInfo || undefined,
        minCollateralRatioBPS: loan.minCollateralRatioBPS || 0n,
        liquidationThresholdBPS: loan.liquidationThresholdBPS || 0n,
        maxPriceStaleness: loan.maxPriceStaleness || 0n,
        repaidAmount: loan.repaidAmount || 0n,
      };
    },
    [calculateInterest, calculateTotalRepayment, isLoanDefaulted]
  );

  const loanDetails = React.useMemo(() => {
    return loanWithPrices ? formatLoanDetails(loanWithPrices) : null;
  }, [loanWithPrices, formatLoanDetails]);

  // Fetch additional loan data
  const fetchAdditionalData = async () => {
    if (!loanDetails || loanDetails.status !== LoanStatus.Active) return;

    try {
      const [health, repayment] = await Promise.all([
        getLoanHealthFactor(loanDetails.id),
        getLoanRepaymentInfo(loanDetails.id),
      ]);
      setHealthData(health);
      setRepaymentInfo(repayment);
    } catch (error) {
      console.error("Failed to fetch additional loan data:", error);
    }
  };

  useEffect(() => {
    if (loanDetails) {
      fetchAdditionalData();
    }
  }, [loanDetails?.id, loanDetails?.status]);

  // Show stuck loading message after 10 seconds
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isLoadingSubgraph || isLoadingPrices) {
      timeoutId = setTimeout(() => {
        setShowStuckMessage(true);
      }, 10000); // 10 seconds
    } else {
      setShowStuckMessage(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoadingSubgraph, isLoadingPrices]);

  // Refresh all data
  const refreshAllData = () => {
    refreshPrices();
    fetchAdditionalData();
  };

  // Action handlers
  const handleRepayLoan = async () => {
    if (!address || !loanDetails) return;

    try {
      setSelectedAction("repay");
      await repayLoan(loanDetails.id, loanDetails);
      // Invalidate cache to force fresh data
      invalidateSubgraphCache();
      refreshAllData();
    } catch (error) {
      console.error("Failed to repay loan:", error);
    } finally {
      setSelectedAction(null);
    }
  };

  const handleLiquidateLoan = async () => {
    if (!address || !loanDetails) return;

    try {
      setSelectedAction("liquidate");
      await liquidateLoan(loanDetails.id);
      // Invalidate cache to force fresh data
      invalidateSubgraphCache();
      refreshAllData();
    } catch (error) {
      console.error("Failed to liquidate loan:", error);
    } finally {
      setSelectedAction(null);
    }
  };

  const handleCancelLoan = async () => {
    if (!address || !loanDetails) return;

    try {
      setSelectedAction("cancel");
      await cancelLoanOffer(loanDetails.id);
      // Invalidate cache to force fresh data
      invalidateSubgraphCache();
      refreshAllData();
    } catch (error) {
      console.error("Failed to cancel loan offer:", error);
    } finally {
      setSelectedAction(null);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Loading state
  if (isLoadingSubgraph || isLoadingPrices || !loanDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Stuck Loading Message */}
        {showStuckMessage && (isLoadingSubgraph || isLoadingPrices) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-96 mx-4">
              <CardContent className="pt-6 text-center">
                <div className="mb-4">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">
                    Taking longer than usual...
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    The page seems to be stuck loading. This might be due to
                    network issues or the subgraph being slow.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Page
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowStuckMessage(false)}
                    className="w-full"
                  >
                    Continue Waiting
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loan not found
  if (!loan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Loan Not Found</CardTitle>
            <CardDescription>
              The loan with ID #{resolvedParams.id} could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/my-loans")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Loans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is involved in this loan
  const isLender =
    address && loanDetails.lender.toLowerCase() === address.toLowerCase();
  const isBorrower =
    address && loanDetails.borrower.toLowerCase() === address.toLowerCase();
  const userRole = isLender ? "lender" : isBorrower ? "borrower" : null;

  if (!isConnected || !userRole) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              {!isConnected
                ? "Please connect your wallet to view loan details."
                : "You are not authorized to view this loan."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/my-loans")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Loans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/my-loans")}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Loan {loanDetails.id.toString()}
            </h1>
            <p className="text-gray-600 mt-1">
              Detailed view and management for your{" "}
              {userRole === "lender" ? "loan offer" : "borrowed loan"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={
              loanDetails.status === LoanStatus.Pending
                ? "default"
                : loanDetails.status === LoanStatus.Active
                  ? "secondary"
                  : loanDetails.status === LoanStatus.Repaid
                    ? "outline"
                    : "destructive"
            }
            className="text-sm px-3 py-1"
          >
            {loanDetails.statusText}
          </Badge>
          <Button
            onClick={refreshAllData}
            variant="outline"
            size="sm"
            disabled={isLoadingPrices}
            className="border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
          >
            {isLoadingPrices ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Transaction Status */}
      {transactionState.step !== "idle" && selectedAction && (
        <Alert className="mb-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {transactionState.step === "approving" && "Approving tokens..."}
            {transactionState.step === "repaying" && "Processing repayment..."}
            {transactionState.step === "liquidating" &&
              "Processing liquidation..."}
            {transactionState.step === "cancelling" &&
              "Cancelling loan offer..."}
          </AlertDescription>
        </Alert>
      )}

      {/* Error/Success Alerts */}
      {transactionState.isError && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{transactionState.error}</AlertDescription>
        </Alert>
      )}

      {transactionState.isSuccess && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Transaction completed successfully! Hash:{" "}
            {transactionState.hash?.slice(0, 10)}...
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Overview */}
          <Card className="luxury-shadow-lg">
            <CardHeader className="gradient-bg">
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span>Loan Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="text-2xl font-bold text-primary">
                    {parseFloat(loanDetails.formattedAmount).toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-primary/80">
                    {loanDetails.tokenInfo?.symbol || "Tokens"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Principal Amount
                  </div>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-25 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {loanDetails.formattedInterestRate.toFixed(2)}%
                  </div>
                  <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Annual Rate
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Interest Rate
                  </div>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-25 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {Math.round(loanDetails.formattedDuration)}
                  </div>
                  <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Days Total
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Loan Duration
                  </div>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-violet-25 dark:from-violet-900/20 dark:to-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                    {parseFloat(
                      loanDetails.formattedCollateralAmount
                    ).toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-violet-700 dark:text-violet-300">
                    {loanDetails.collateralInfo?.symbol || "Tokens"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Collateral Locked
                  </div>
                </div>
              </div>

              <Separator />

              {/* Loan Progress */}
              {loanDetails.status === LoanStatus.Active && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Loan Progress</span>
                    <span
                      className={`text-sm ${loanDetails.isOverdue ? "text-red-600" : "text-muted-foreground"}`}
                    >
                      {loanDetails.timeRemaining}
                    </span>
                  </div>
                  <Progress
                    value={loanDetails.progressPercent}
                    className={`h-3 ${loanDetails.isOverdue ? "bg-red-100" : ""}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Started:{" "}
                      {new Date(
                        Number(loanDetails.startTime) * 1000
                      ).toLocaleDateString()}
                    </span>
                    <span>
                      Due:{" "}
                      {new Date(
                        Number(loanDetails.startTime + loanDetails.duration) *
                          1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Repayment Information */}
              {userRole === "borrower" &&
                loanDetails.status === LoanStatus.Active &&
                repaymentInfo && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Repayment Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Owed</div>
                        <div className="font-semibold">
                          {parseFloat(
                            ethers.formatUnits(
                              repaymentInfo.totalOwed,
                              loanDetails.tokenInfo?.decimals || 6
                            )
                          ).toLocaleString()}{" "}
                          {loanDetails.tokenInfo?.symbol}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Interest Accrued
                        </div>
                        <div className="font-semibold text-orange-600">
                          {parseFloat(
                            ethers.formatUnits(
                              repaymentInfo.interestAccrued,
                              loanDetails.tokenInfo?.decimals || 6
                            )
                          ).toLocaleString()}{" "}
                          {loanDetails.tokenInfo?.symbol}
                        </div>
                      </div>
                      {repaymentInfo.repaidAmount > 0n && (
                        <>
                          <div>
                            <div className="text-muted-foreground">
                              Already Repaid
                            </div>
                            <div className="font-semibold text-green-600">
                              {parseFloat(
                                ethers.formatUnits(
                                  repaymentInfo.repaidAmount,
                                  loanDetails.tokenInfo?.decimals || 6
                                )
                              ).toLocaleString()}{" "}
                              {loanDetails.tokenInfo?.symbol}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">
                              Remaining
                            </div>
                            <div className="font-semibold">
                              {parseFloat(
                                ethers.formatUnits(
                                  repaymentInfo.remainingAmount,
                                  loanDetails.tokenInfo?.decimals || 6
                                )
                              ).toLocaleString()}{" "}
                              {loanDetails.tokenInfo?.symbol}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Loan Participants */}
          <Card className="luxury-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Loan Participants</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-emerald-50/50 to-emerald-25/30 dark:from-emerald-900/10 dark:to-emerald-900/5 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        Lender
                      </span>
                    </div>
                    {isLender && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                      >
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-lg border border-emerald-200/40 dark:border-emerald-800/40 font-mono">
                      {formatAddress(loanDetails.lender)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(loanDetails.lender)}
                      className="h-8 w-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/2 border border-primary/20 rounded-xl hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="font-semibold text-primary">
                        Borrower
                      </span>
                    </div>
                    {isBorrower && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-lg border border-primary/20 font-mono">
                      {formatAddress(loanDetails.borrower)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(loanDetails.borrower)}
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Information */}
          <Card className="luxury-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="h-5 w-5 text-primary" />
                <span>Token Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/2 border border-primary/20 rounded-xl">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Coins className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-primary">Loan Token</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Name
                      </span>
                      <span className="font-medium text-foreground">
                        {loanDetails.tokenInfo?.name || "Unknown Token"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Symbol
                      </span>
                      <span className="font-semibold text-primary">
                        {loanDetails.tokenInfo?.symbol || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Decimals
                      </span>
                      <span className="font-medium text-foreground">
                        {loanDetails.tokenInfo?.decimals || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Contract
                      </span>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-white/60 dark:bg-gray-800/60 px-2 py-1 rounded-md border border-primary/20 font-mono">
                          {formatAddress(loanDetails.tokenAddress)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(loanDetails.tokenAddress)
                          }
                          className="h-7 w-7 p-0 hover:bg-primary/10"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-violet-50/50 to-violet-25/30 dark:from-violet-900/10 dark:to-violet-900/5 border border-violet-200/60 dark:border-violet-800/40 rounded-xl">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                      <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h4 className="font-semibold text-violet-700 dark:text-violet-300">
                      Collateral Token
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Name
                      </span>
                      <span className="font-medium text-foreground">
                        {loanDetails.collateralInfo?.name || "Unknown Token"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Symbol
                      </span>
                      <span className="font-semibold text-violet-600 dark:text-violet-400">
                        {loanDetails.collateralInfo?.symbol || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Decimals
                      </span>
                      <span className="font-medium text-foreground">
                        {loanDetails.collateralInfo?.decimals || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Contract
                      </span>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-white/60 dark:bg-gray-800/60 px-2 py-1 rounded-md border border-violet-200/40 dark:border-violet-800/40 font-mono">
                          {formatAddress(loanDetails.collateralAddress)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(loanDetails.collateralAddress)
                          }
                          className="h-7 w-7 p-0 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Management Tools for Active Borrowed Loans */}
          {userRole === "borrower" &&
            loanDetails.status === LoanStatus.Active && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* <LoanHealthManager
                  loan={loanDetails}
                  tokenInfo={loanDetails.tokenInfo}
                  collateralInfo={loanDetails.collateralInfo}
                  onUpdate={refreshAllData}
                /> */}
                <PartialRepaymentManager
                  loan={loanDetails}
                  tokenInfo={loanDetails.tokenInfo}
                  onUpdate={refreshAllData}
                />
              </div>
            )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="luxury-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Borrower Actions */}
              {userRole === "borrower" &&
                loanDetails.status === LoanStatus.Active && (
                  <Button
                    onClick={handleRepayLoan}
                    disabled={transactionState.isLoading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {transactionState.isLoading &&
                    selectedAction === "repay" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Repay Full Loan
                  </Button>
                )}

              {/* Lender Actions */}
              {userRole === "lender" &&
                loanDetails.status === LoanStatus.Pending && (
                  <Button
                    onClick={handleCancelLoan}
                    disabled={transactionState.isLoading}
                    variant="destructive"
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {transactionState.isLoading &&
                    selectedAction === "cancel" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="mr-2 h-4 w-4" />
                    )}
                    Cancel Offer
                  </Button>
                )}

              {userRole === "lender" &&
                loanDetails.status === LoanStatus.Active &&
                loanDetails.isOverdue && (
                  <Button
                    onClick={handleLiquidateLoan}
                    disabled={transactionState.isLoading}
                    variant="destructive"
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {transactionState.isLoading &&
                    selectedAction === "liquidate" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="mr-2 h-4 w-4" />
                    )}
                    Liquidate Loan
                  </Button>
                )}

              <Separator />

              <Button
                onClick={() => router.push("/my-loans")}
                variant="outline"
                className="w-full border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Loans
              </Button>
            </CardContent>
          </Card>

          {/* Loan Health (for active loans) */}
          {loanDetails.status === LoanStatus.Active && healthData && (
            <Card className="luxury-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Loan Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {(Number(healthData.currentRatio) / 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Health Factor
                    </div>
                  </div>

                  <Progress
                    value={Math.min(Number(healthData.currentRatio) / 100, 200)}
                    max={200}
                    className="h-2"
                  />

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-red-600 dark:text-red-400 font-semibold">
                        120%
                      </div>
                      <div className="text-red-500 dark:text-red-300 text-xs">
                        Liquidation
                      </div>
                    </div>
                    <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="text-amber-600 dark:text-amber-400 font-semibold">
                        130%
                      </div>
                      <div className="text-amber-500 dark:text-amber-300 text-xs">
                        At Risk
                      </div>
                    </div>
                    <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        150%+
                      </div>
                      <div className="text-emerald-500 dark:text-emerald-300 text-xs">
                        Healthy
                      </div>
                    </div>
                  </div>

                  {healthData.priceStale && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Price data is stale. Health factor may not be accurate.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loan Timeline */}
          <Card className="luxury-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Timer className="h-5 w-5 text-primary" />
                <span>Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="text-sm">
                    <div className="font-medium">Loan Created</div>
                    <div className="text-muted-foreground">
                      {new Date(
                        Number(loanDetails.createdAt) * 1000
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                {loanDetails.status >= LoanStatus.Active && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm">
                      <div className="font-medium">Loan Started</div>
                      <div className="text-muted-foreground">
                        {new Date(
                          Number(loanDetails.startTime) * 1000
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {loanDetails.status === LoanStatus.Active && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <div className="text-sm">
                      <div className="font-medium">Due Date</div>
                      <div
                        className={`${loanDetails.isOverdue ? "text-red-600" : "text-muted-foreground"}`}
                      >
                        {new Date(
                          Number(loanDetails.startTime + loanDetails.duration) *
                            1000
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {loanDetails.status >= LoanStatus.Repaid && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div className="text-sm">
                      <div className="font-medium">
                        {loanDetails.status === LoanStatus.Repaid
                          ? "Repaid"
                          : loanDetails.status === LoanStatus.Defaulted
                            ? "Defaulted"
                            : "Cancelled"}
                      </div>
                      <div className="text-muted-foreground">
                        {/* This would need to be tracked in the contract or subgraph */}
                        Status updated
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
