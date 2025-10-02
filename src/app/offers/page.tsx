"use client";

import React, { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useP2PLending } from "@/hooks/useP2PLending";
import { Loan, LoanStatus } from "@/lib/contracts";
import { SOMNIA_TESTNET_CONFIG } from "@/lib/contracts";
import {
  useAllLoansWithStatus,
  ProcessedLoan,
  useProtocolStatsCollection,
} from "@/hooks/useSubgraphQuery";
import {
  useLivePriceComparison,
  LoanWithPriceComparison,
} from "@/hooks/useLivePriceComparison";
import { useRewards } from "@/hooks/useRewards";
import { TransactionModal } from "@/components/TransactionModal";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  DollarSign,
  Calendar,
  Shield,
  RefreshCw,
  Gift,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { ethers } from "ethers";
import { getTokenByAddress } from "@/config/tokens";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

interface LoanOfferWithDetails extends LoanWithPriceComparison {
  formattedAmount: string;
  formattedCollateralAmount: string;
  formattedInterestRate: number;
  formattedDuration: number;
  statusText: string;
  tokenInfo?: TokenInfo;
  collateralInfo?: TokenInfo;
}

// Function to fetch token information
const fetchTokenInfo = async (
  tokenAddress: string
): Promise<TokenInfo | null> => {
  try {
    const provider = new ethers.JsonRpcProvider(
      SOMNIA_TESTNET_CONFIG.rpcUrls.default.http[0]
    );
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
      ],
      provider
    );

    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    return { name, symbol, decimals: Number(decimals) };
  } catch (error) {
    console.error(`Failed to fetch token info for ${tokenAddress}:`, error);
    return null;
  }
};

export default function OffersPage() {
  const {
    acceptLoanOffer,
    cancelLoanOffer,
    transactionState,
    resetTransactionState,
    isConnected,
    address,
  } = useP2PLending();

  // Use subgraph data instead of RPC calls
  const {
    loans: allLoans,
    loading: isLoadingSubgraph,
    error: subgraphError,
  } = useAllLoansWithStatus();

  // Filter for pending loans only
  const pendingLoans = React.useMemo(() => {
    return allLoans.filter((loan) => loan.status === 0); // Pending status
  }, [allLoans]);

  // Get live price comparison data
  const {
    loans: loansWithPrices,
    loading: isLoadingPrices,
    error: pricesError,
    refreshPrices,
    lastUpdated,
    priceChangeStats,
  } = useLivePriceComparison(pendingLoans, {
    refreshInterval: 120000, // 2 minutes
    enableAutoRefresh: true,
  });

  // Get rewards data
  const {
    currentRewardsAPR,
    formatAPR,
    rewardsSystemAvailable,
    globalRewardStats,
  } = useRewards();

  const [selectedLoanId, setSelectedLoanId] = useState<bigint | null>(null);
  const [showStuckMessage, setShowStuckMessage] = useState(false);
  const { data: protocolStats, loading: isLoadingProtocolStats } =
    useProtocolStatsCollection();

  // Show stuck loading message after 10 seconds
  React.useEffect(() => {
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

  // Format loans with token information for display
  const formattedLoans = React.useMemo(() => {
    return loansWithPrices.map((loan) => {
      const tokenInfo = getTokenByAddress(loan.tokenAddress);
      const collateralInfo = getTokenByAddress(loan.collateralAddress);

      const formattedAmount = tokenInfo
        ? ethers.formatUnits(loan.amount, tokenInfo.decimals)
        : ethers.formatEther(loan.amount);

      const formattedCollateralAmount = collateralInfo
        ? ethers.formatUnits(loan.collateralAmount, collateralInfo.decimals)
        : ethers.formatEther(loan.collateralAmount);

      return {
        ...loan,
        formattedAmount,
        formattedCollateralAmount,
        formattedInterestRate: Number(loan.interestRate) / 100,
        formattedDuration: Number(loan.duration) / (24 * 60 * 60),
        statusText: ["Pending", "Active", "Repaid", "Defaulted", "Cancelled"][
          loan.status
        ],
        tokenInfo,
        collateralInfo,
      };
    });
  }, [loansWithPrices]);

  const handleAcceptOffer = async (loan: LoanOfferWithDetails) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (loan.lender.toLowerCase() === address.toLowerCase()) {
      alert("You cannot accept your own loan offer");
      return;
    }

    try {
      setSelectedLoanId(loan.id);
      await acceptLoanOffer(loan.id, loan);
      // Refresh the data after successful acceptance
      refreshPrices();
    } catch (error) {
      console.error("Failed to accept loan offer:", error);
    } finally {
      setSelectedLoanId(null);
    }
  };

  const handleCancelOffer = async (loan: LoanOfferWithDetails) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (loan.lender.toLowerCase() !== address.toLowerCase()) {
      alert("You can only cancel your own loan offers");
      return;
    }

    try {
      setSelectedLoanId(loan.id);
      await cancelLoanOffer(loan.id);
      // Refresh the data after successful cancellation
      refreshPrices();
    } catch (error) {
      console.error("Failed to cancel loan offer:", error);
    } finally {
      setSelectedLoanId(null);
    }
  };

  const handleRefresh = () => {
    refreshPrices();
  };

  // Calculate rewards APR for display
  const calculateRewardsAPR = () => {
    if (!rewardsSystemAvailable || !currentRewardsAPR || !globalRewardStats) {
      return "0.00";
    }
    return formatAPR(currentRewardsAPR);
  };

  // const calculateTotalAPR = (interestRate: bigint) => {
  //   const interestAPR = parseFloat((Number(interestRate) / 100).toFixed(2));
  //   const rewardsAPR = parseFloat(calculateRewardsAPR());
  //   return (interestAPR + rewardsAPR).toFixed(2);
  // };

  // Transaction progress now handled by TransactionModal component

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Available Loan Offers</h1>
          <p className="text-muted-foreground mt-2">
            Browse and accept loan offers from lenders on DreamLend
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Updated {Math.floor((Date.now() - lastUpdated) / 1000)}s ago
              </span>
            </div>
          )}
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isLoadingSubgraph || isLoadingPrices}
          >
            {isLoadingSubgraph || isLoadingPrices ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Offers
          </Button>
        </div>
      </div>

      {/* Transaction Progress - Now handled by TransactionModal */}

      {(subgraphError || pricesError) && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {subgraphError && `Failed to load loan data: ${subgraphError}`}
            {subgraphError && pricesError && " | "}
            {pricesError && `Failed to load prices: ${pricesError}`}
          </AlertDescription>
        </Alert>
      )}

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

      {isLoadingSubgraph || isLoadingPrices ? (
        <Card>
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      ) : formattedLoans.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Active Loan Offers
              </h3>
              <p className="text-muted-foreground">
                There are currently no active loan offers available. Check back
                later or create your own!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Total Volume</span>
                </div>
                <p className="text-2xl font-bold">
                  {/* {loanOffers
                    .reduce(
                      (sum, loan) => sum + parseFloat(loan.formattedAmount),
                      0
                    )
                    .toFixed(2)}{" "} */}
                  {Number(
                    protocolStats?.protocolStats_collection?.[0]
                      ?.totalLoanVolumeUSD
                  ).toFixed(2)}{" "}
                  $
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Average Duration</span>
                </div>
                <p className="text-2xl font-bold">
                  {formattedLoans.length > 0
                    ? Math.round(
                        formattedLoans.reduce(
                          (sum, loan) => sum + loan.formattedDuration,
                          0
                        ) / formattedLoans.length
                      )
                    : 0}{" "}
                  Days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Active Offers</span>
                </div>
                <p className="text-2xl font-bold">
                  {
                    protocolStats?.protocolStats_collection?.[0]
                      ?.totalLoansCreated
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Price Trends</span>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-green-600">
                    ↑{priceChangeStats.pricesUp}
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    ↓{priceChangeStats.pricesDown}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prices up/down since creation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Premium Offers Table */}
          <Card className="luxury-shadow-lg glass">
            <CardHeader className="gradient-bg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">
                      Available Loan Offers
                    </CardTitle>
                    <CardDescription>
                      {formattedLoans.length} loan offer
                      {formattedLoans.length !== 1 ? "s" : ""} available
                    </CardDescription>
                  </div>
                </div>
                {/* {rewardsSystemAvailable && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-accent/10 to-primary/10 dark:from-accent/5 dark:to-primary/5 border border-accent/20 dark:border-accent/10">
                    <Gift className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-accent-foreground">
                      +{calculateRewardsAPR()}% Rewards APR
                    </span>
                  </div>
                )} */}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-muted/30">
                      {/* <TableHead className="font-semibold text-muted-foreground">
                        Loan ID
                      </TableHead> */}
                      <TableHead className="font-semibold text-muted-foreground">
                        Amount & Live Value
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Price Change
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Interest APR
                      </TableHead>
                      {/* {rewardsSystemAvailable && (
                        <TableHead className="font-semibold text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Gift className="h-3 w-3 text-accent" />
                            <span>Rewards APR</span>
                          </div>
                        </TableHead>
                      )} */}
                      {/* <TableHead className="font-semibold text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3 text-success" />
                          <span>Total APR</span>
                        </div>
                      </TableHead> */}
                      <TableHead className="font-semibold text-muted-foreground">
                        Duration
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Collateral Required
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Lender
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formattedLoans.map((loan, index) => (
                      <TableRow
                        key={loan.id.toString()}
                        className={`
                          border-border/30 hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 
                          transition-all duration-300 group
                          ${index % 2 === 0 ? "bg-muted/20" : "bg-background"}
                        `}
                      >
                        {/* <TableCell className="font-medium font-mono text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent"></div>
                            <span>#{loan.id.toString()}</span>
                          </div>
                        </TableCell> */}
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {parseFloat(loan.formattedAmount).toFixed(4)}{" "}
                              <span className="text-primary font-medium">
                                {loan.tokenInfo?.symbol || "Tokens"}
                              </span>
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm text-green-600 font-medium">
                                ${loan.currentLoanValueUSD}
                              </p>
                              {/* {loan.historicalAmountUSD && (
                                <p className="text-xs text-muted-foreground">
                                  Was $
                                  {parseFloat(loan.historicalAmountUSD).toFixed(
                                    2
                                  )}{" "}
                                  at creation
                                </p>
                              )} */}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {loan.tokenInfo?.name ||
                                `${loan.tokenAddress.slice(0, 6)}...${loan.tokenAddress.slice(-4)}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {loan.currentTokenPrice?.success ? (
                              <>
                                <Badge
                                  variant="secondary"
                                  className={`${
                                    loan.priceChangeIndicator.isPositive
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : loan.loanTokenPriceDirection === "down"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : "bg-gray-50 text-gray-700 border-gray-200"
                                  }`}
                                >
                                  {loan.loanTokenPriceDirection === "up" && (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                  )}
                                  {loan.loanTokenPriceDirection === "down" && (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                  )}
                                  {loan.priceChangeIndicator.percentage}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  Current: ${loan.currentTokenPrice.priceUSD}
                                </p>
                                {loan.isStalePrice && (
                                  <p className="text-xs text-orange-600">
                                    ⚠ Stale price
                                  </p>
                                )}
                              </>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Price Error
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/5 dark:to-primary/3 text-primary border-primary/20 dark:border-primary/10"
                          >
                            {loan.formattedInterestRate.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        {/* {rewardsSystemAvailable && (
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-gradient-to-r from-accent-foreground/10 to-accent-foreground/5 dark:from-accent-foreground/5 dark:to-accent-foreground/3 text-accent-foreground border-accent-foreground/20 dark:border-accent-foreground/10"
                            >
                              <Gift className="h-3 w-3 mr-1" />+
                              {calculateRewardsAPR()}%
                            </Badge>
                          </TableCell>
                        )} */}
                        {/* <TableCell>
                          <Badge className="bg-gradient-to-r from-success to-success/80 text-success-foreground font-semibold shadow-sm">
                            {calculateTotalAPR(loan.interestRate)}%
                          </Badge>
                        </TableCell> */}
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 text-warning" />
                            <span className="font-medium">
                              {Math.round(loan.formattedDuration)} days
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {parseFloat(
                                loan.formattedCollateralAmount
                              ).toFixed(4)}{" "}
                              <span className="text-primary font-medium">
                                {loan.collateralInfo?.symbol || "Tokens"}
                              </span>
                            </p>
                            <p className="text-sm text-blue-600 font-medium">
                              ${loan.currentCollateralValueUSD}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {loan.collateralInfo?.name ||
                                `${loan.collateralAddress.slice(0, 6)}...${loan.collateralAddress.slice(-4)}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground">
                            {loan.lender.slice(0, 6)}...{loan.lender.slice(-4)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              loan.status === LoanStatus.Pending
                                ? "default"
                                : "secondary"
                            }
                            className={
                              loan.status === LoanStatus.Pending
                                ? "status-dot success"
                                : ""
                            }
                          >
                            {loan.statusText}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {loan.lender.toLowerCase() ===
                          address?.toLowerCase() ? (
                            <div className="space-y-2">
                              <Badge
                                variant="outline"
                                className="text-xs bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/5 dark:to-warning/3 text-warning border-warning/20 dark:border-warning/10"
                              >
                                Your Offer
                              </Badge>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancelOffer(loan)}
                                disabled={
                                  transactionState.isLoading ||
                                  loan.status !== LoanStatus.Pending ||
                                  (selectedLoanId !== null &&
                                    selectedLoanId !== loan.id)
                                }
                                className=" ml-6 btn-premium"
                              >
                                {transactionState.isLoading &&
                                  selectedLoanId === loan.id && (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  )}
                                {transactionState.step === "cancelling" &&
                                selectedLoanId === loan.id
                                  ? "Cancelling..."
                                  : "Cancel Offer"}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptOffer(loan)}
                              disabled={
                                transactionState.isLoading ||
                                loan.status !== LoanStatus.Pending ||
                                (selectedLoanId !== null &&
                                  selectedLoanId !== loan.id)
                              }
                              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground btn-premium shadow-sm"
                            >
                              {transactionState.isLoading &&
                                selectedLoanId === loan.id && (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                )}
                              {transactionState.step === "approving" &&
                              selectedLoanId === loan.id
                                ? "Approving..."
                                : transactionState.step === "accepting" &&
                                    selectedLoanId === loan.id
                                  ? "Accepting..."
                                  : "Accept"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={transactionState.step !== "idle"}
        onClose={resetTransactionState}
        transactionState={transactionState}
        onReset={resetTransactionState}
        onViewLoans={() => {
          resetTransactionState();
          window.location.href = "/my-loans";
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
