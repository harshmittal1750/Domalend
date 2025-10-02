"use client";

import React, { useState, useCallback } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useP2PLending } from "@/hooks/useP2PLending";
import { LoanStatus } from "@/lib/contracts";
import { useAllLoansWithStatus, ProcessedLoan } from "@/hooks/useSubgraphQuery";
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
  Eye,
  ChevronRight,
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
  // Add missing Loan fields with defaults
  minCollateralRatioBPS: bigint;
  liquidationThresholdBPS: bigint;
  maxPriceStaleness: bigint;
  repaidAmount: bigint;
}

export default function MyLoansPage() {
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
  } = useP2PLending();

  // Use subgraph data instead of RPC calls
  const {
    loans: allLoans,
    loading: isLoadingSubgraph,
    error: subgraphError,
  } = useAllLoansWithStatus();

  // Filter loans by user role
  const lenderLoans = React.useMemo(() => {
    if (!address) return [];
    return allLoans.filter(
      (loan) => loan.lender.toLowerCase() === address.toLowerCase()
    );
  }, [allLoans, address]);

  const borrowerLoans = React.useMemo(() => {
    if (!address) return [];
    return allLoans.filter(
      (loan) => loan.borrower.toLowerCase() === address.toLowerCase()
    );
  }, [allLoans, address]);

  // Get live price comparison data
  const {
    loans: lenderLoansWithPrices,
    loading: isLoadingLenderPrices,
    refreshPrices: refreshLenderPrices,
  } = useLivePriceComparison(lenderLoans, {
    refreshInterval: 120000, // 2 minutes
    enableAutoRefresh: true,
  });

  const {
    loans: borrowerLoansWithPrices,
    loading: isLoadingBorrowerPrices,
    refreshPrices: refreshBorrowerPrices,
  } = useLivePriceComparison(borrowerLoans, {
    refreshInterval: 120000, // 2 minutes
    enableAutoRefresh: true,
  });

  const [selectedLoanId, setSelectedLoanId] = useState<bigint | null>(null);
  const [actionType, setActionType] = useState<
    "repay" | "liquidate" | "cancel" | null
  >(null);
  const [showStuckMessage, setShowStuckMessage] = useState(false);

  // Show stuck loading message after 10 seconds
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isLoadingSubgraph || isLoadingLenderPrices || isLoadingBorrowerPrices) {
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
  }, [isLoadingSubgraph, isLoadingLenderPrices, isLoadingBorrowerPrices]);
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
          timeRemaining = `${Math.ceil(days)} days`;
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
        formattedInterestRate: Number(loan.interestRate) / 100, // Convert from basis points
        formattedDuration: Number(loan.duration) / (24 * 60 * 60), // Convert seconds to days
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
        // Add missing fields with defaults
        minCollateralRatioBPS: loan.minCollateralRatioBPS || 0n,
        liquidationThresholdBPS: loan.liquidationThresholdBPS || 0n,
        maxPriceStaleness: loan.maxPriceStaleness || 0n,
        repaidAmount: loan.repaidAmount || 0n,
      };
    },
    [calculateInterest, calculateTotalRepayment, isLoanDefaulted]
  );

  // Format loans with pricing data for display
  const lenderLoanDetails = React.useMemo(() => {
    return lenderLoansWithPrices.map(formatLoanDetails);
  }, [lenderLoansWithPrices, formatLoanDetails]);

  const borrowerLoanDetails = React.useMemo(() => {
    return borrowerLoansWithPrices.map(formatLoanDetails);
  }, [borrowerLoansWithPrices, formatLoanDetails]);

  // Refresh all data
  const refreshAllData = () => {
    refreshLenderPrices();
    refreshBorrowerPrices();
  };

  const handleRepayLoan = async (loan: LoanWithDetails) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setSelectedLoanId(loan.id);
      setActionType("repay");
      await repayLoan(loan.id, loan);
      // Refresh the loan data after successful repayment
      refreshAllData();
    } catch (error) {
      console.error("Failed to repay loan:", error);
    } finally {
      setSelectedLoanId(null);
      setActionType(null);
    }
  };

  const handleLiquidateLoan = async (loan: LoanWithDetails) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setSelectedLoanId(loan.id);
      setActionType("liquidate");
      await liquidateLoan(loan.id);
      // Refresh the loan data after successful liquidation
      refreshAllData();
    } catch (error) {
      console.error("Failed to liquidate loan:", error);
    } finally {
      setSelectedLoanId(null);
      setActionType(null);
    }
  };

  const handleCancelLoan = async (loan: LoanWithDetails) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (loan.status !== LoanStatus.Pending) {
      alert("Only pending loan offers can be cancelled");
      return;
    }

    try {
      setSelectedLoanId(loan.id);
      setActionType("cancel");
      await cancelLoanOffer(loan.id);
      // Refresh the loan data after successful cancellation
      refreshAllData();
    } catch (error) {
      console.error("Failed to cancel loan offer:", error);
    } finally {
      setSelectedLoanId(null);
      setActionType(null);
    }
  };

  const getActionButton = (
    loan: LoanWithDetails,
    userRole: "lender" | "borrower"
  ) => {
    const isCurrentLoan = selectedLoanId === loan.id;
    const isLoading = transactionState.isLoading && isCurrentLoan;

    // Borrower can repay active loans
    if (userRole === "borrower" && loan.status === LoanStatus.Active) {
      return (
        <Button
          size="sm"
          onClick={() => handleRepayLoan(loan)}
          disabled={isLoading || (selectedLoanId !== null && !isCurrentLoan)}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading && actionType === "repay" && (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          )}
          {isLoading && actionType === "repay" && isCurrentLoan
            ? transactionState.step === "approving"
              ? "Approving..."
              : "Repaying..."
            : "Repay Loan"}
        </Button>
      );
    }

    // Lender can cancel pending offers
    if (userRole === "lender" && loan.status === LoanStatus.Pending) {
      return (
        <Button
          size="sm"
          onClick={() => handleCancelLoan(loan)}
          disabled={isLoading || (selectedLoanId !== null && !isCurrentLoan)}
          variant="destructive"
        >
          {isLoading && actionType === "cancel" && (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          )}
          {isLoading && actionType === "cancel" && isCurrentLoan
            ? "Cancelling..."
            : "Cancel Offer"}
        </Button>
      );
    }

    // Lender can liquidate overdue active loans
    if (
      userRole === "lender" &&
      loan.status === LoanStatus.Active &&
      loan.isOverdue
    ) {
      return (
        <Button
          size="sm"
          onClick={() => handleLiquidateLoan(loan)}
          disabled={isLoading || (selectedLoanId !== null && !isCurrentLoan)}
          variant="destructive"
        >
          {isLoading && actionType === "liquidate" && (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          )}
          {isLoading && actionType === "liquidate" && isCurrentLoan
            ? "Liquidating..."
            : "Liquidate"}
        </Button>
      );
    }

    return (
      <Badge variant="outline" className="text-xs">
        {loan.statusText}
      </Badge>
    );
  };

  const renderLoanTable = (
    loans: LoanWithDetails[],
    userRole: "lender" | "borrower"
  ) => {
    if (loans.length === 0) {
      const emptyMessage =
        userRole === "lender"
          ? "You haven&apos;t created any loan offers yet."
          : "You haven&apos;t accepted any loan offers yet.";
      const actionLink = userRole === "lender" ? "/create" : "/offers";
      const actionText =
        userRole === "lender"
          ? "Create your first loan offer"
          : "Browse available offers";

      return (
        <div className="text-center py-8">
          {userRole === "lender" ? (
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          ) : (
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {userRole === "lender" ? "No Loan Offers" : "No Borrowed Loans"}
          </h3>
          <p className="text-gray-600 mb-4">{emptyMessage}</p>
          <a href={actionLink} className="text-blue-600 hover:text-blue-800">
            {actionText} →
          </a>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loan ID</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>APR</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Collateral</TableHead>
            {userRole === "borrower" && <TableHead>Total Repayment</TableHead>}
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow
              key={loan.id.toString()}
              className="cursor-pointer hover:bg-primary/5 transition-all duration-200 group"
              onClick={() =>
                (window.location.href = `/my-loans/${loan.id.toString()}`)
              }
            >
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <div className="text-primary font-semibold group-hover:text-primary/80 transition-colors">
                    {loan.id.toString()}
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary/60 transition-all duration-200 opacity-0 group-hover:opacity-100" />
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium group-hover:text-foreground/90 transition-colors">
                    {parseFloat(loan.formattedAmount).toFixed(4)}{" "}
                    {loan.tokenInfo?.symbol || "Tokens"}
                  </p>
                  <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                    {loan.tokenAddress.slice(0, 6)}...
                    {loan.tokenAddress.slice(-4)}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {loan.formattedInterestRate.toFixed(2)}%
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1 group-hover:text-foreground/90 transition-colors">
                  <Calendar className="h-3 w-3 text-muted-foreground group-hover:text-muted-foreground/80 transition-colors" />
                  <span>{Math.round(loan.formattedDuration)} days</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium group-hover:text-foreground/90 transition-colors">
                    {parseFloat(loan.formattedCollateralAmount).toFixed(4)}{" "}
                    {loan.collateralInfo?.symbol || "Tokens"}
                  </p>
                  <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                    {loan.collateralAddress.slice(0, 6)}...
                    {loan.collateralAddress.slice(-4)}
                  </p>
                </div>
              </TableCell>
              {userRole === "borrower" && (
                <TableCell>
                  <div>
                    <p className="font-medium group-hover:text-foreground/90 transition-colors">
                      {parseFloat(loan.formattedTotalRepayment).toFixed(4)}{" "}
                      {loan.tokenInfo?.symbol || "Tokens"}
                    </p>
                    <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                      Interest: {parseFloat(loan.formattedInterest).toFixed(4)}{" "}
                      {loan.tokenInfo?.symbol || "Tokens"}
                    </p>
                  </div>
                </TableCell>
              )}
              <TableCell>
                {loan.status === LoanStatus.Active ? (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            loan.isOverdue ? "bg-red-500" : "bg-blue-500"
                          }`}
                          style={{
                            width: `${Math.min(100, loan.progressPercent)}%`,
                          }}
                        />
                      </div>
                      {loan.isOverdue && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <p
                      className={`text-xs ${
                        loan.isOverdue ? "text-red-600" : "text-gray-600"
                      }`}
                    >
                      {loan.timeRemaining}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    loan.status === LoanStatus.Pending
                      ? "default"
                      : loan.status === LoanStatus.Active
                        ? "secondary"
                        : loan.status === LoanStatus.Repaid
                          ? "outline"
                          : "destructive"
                  }
                >
                  {loan.statusText}
                </Badge>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                {getActionButton(loan, userRole)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Link href={`/my-loans/${loan.id.toString()}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>My Loans</CardTitle>
            <CardDescription>
              Connect your wallet to view your loan activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to Somnia L1 testnet to view your
                loans.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Loans</h1>
          <p className="text-gray-600 mt-2">
            Manage your lending and borrowing activity on DreamLend
          </p>
          <p className="text-sm text-gray-500 font-mono mt-1">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        <Button
          onClick={refreshAllData}
          variant="outline"
          disabled={
            isLoadingSubgraph ||
            isLoadingLenderPrices ||
            isLoadingBorrowerPrices
          }
          className="btn-premium"
        >
          {isLoadingSubgraph ||
          isLoadingLenderPrices ||
          isLoadingBorrowerPrices ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh Loans
        </Button>
      </div>

      {/* Transaction Progress */}
      {transactionState.step !== "idle" && selectedLoanId && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Transaction Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {transactionState.step === "approving" &&
                transactionState.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : transactionState.step === "approving" &&
                  transactionState.isSuccess ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm">
                  {actionType === "repay"
                    ? "Approve Repayment Tokens"
                    : "Approve Transaction"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {(transactionState.step === "repaying" ||
                  transactionState.step === "liquidating") &&
                transactionState.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : transactionState.step === "success" ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm">
                  {actionType === "repay"
                    ? "Complete Loan Repayment"
                    : "Complete Liquidation"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {(transactionState.isError || subgraphError) && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {transactionState.error}
            {transactionState.error && subgraphError && " | "}
            {subgraphError && `Failed to load loan data: ${subgraphError}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {transactionState.isSuccess && (
        <Alert className="mb-6" variant="default">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Transaction completed successfully! Hash:{" "}
            {transactionState.hash?.slice(0, 10)}...
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="luxury-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingSubgraph ? "..." : lenderLoans.length}
                </p>
                <p className="text-sm font-medium text-foreground">As Lender</p>
                <p className="text-xs text-muted-foreground">
                  Loans you&apos;ve offered
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-secondary/20 text-secondary-foreground">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingSubgraph ? "..." : borrowerLoans.length}
                </p>
                <p className="text-sm font-medium text-foreground">
                  As Borrower
                </p>
                <p className="text-xs text-muted-foreground">
                  Loans you&apos;ve taken
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-accent/20 text-accent-foreground">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {lenderLoanDetails.filter(
                    (l) => l.status === LoanStatus.Active
                  ).length +
                    borrowerLoanDetails.filter(
                      (l) => l.status === LoanStatus.Active
                    ).length}
                </p>
                <p className="text-sm font-medium text-foreground">
                  Active Loans
                </p>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {lenderLoanDetails.filter((l) => l.isOverdue).length +
                    borrowerLoanDetails.filter((l) => l.isOverdue).length}
                </p>
                <p className="text-sm font-medium text-foreground">Overdue</p>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stuck Loading Message */}
      {showStuckMessage &&
        (isLoadingSubgraph ||
          isLoadingLenderPrices ||
          isLoadingBorrowerPrices) && (
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

      <div className="grid w-full my-4 items-start gap-4 ">
        <Alert variant={"default"}>
          <AlertCircle className="h-4 w-4 " color="red" />
          <AlertTitle className="font-bold">
            Note: Loan data is fetched from a subgraph and may take a few
            minutes to update after transactions , Try refreshing the page. We
            are working on improving this experience. Thanks for your patience!
          </AlertTitle>
        </Alert>
      </div>

      {/* Loans I'm Offering */}
      <Card className="mb-8 luxury-shadow-lg glass">
        <CardHeader className="gradient-bg">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Loans I&apos;m Offering</span>
          </CardTitle>
          <CardDescription>
            Loans where you are the lender - monitor repayments and liquidate
            overdue loans
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSubgraph || isLoadingLenderPrices ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            renderLoanTable(lenderLoanDetails, "lender")
          )}
        </CardContent>
      </Card>

      {/* Loans I've Borrowed */}
      <Card className="luxury-shadow-lg glass">
        <CardHeader className="gradient-bg">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-secondary-foreground" />
            <span>Loans I&apos;ve Borrowed</span>
          </CardTitle>
          <CardDescription>
            Loans where you are the borrower - track repayment deadlines and
            make payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSubgraph || isLoadingBorrowerPrices ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            renderLoanTable(borrowerLoanDetails, "borrower")
          )}
        </CardContent>
      </Card>
    </div>
  );
}
