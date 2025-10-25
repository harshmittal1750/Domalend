"use client";

import React, { useState, useEffect } from "react";
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
import { DOMA_TESTNET_CONFIG } from "@/lib/contracts";
import {
  useAllLoansWithStatus,
  ProcessedLoan,
  useProtocolStatsCollection,
} from "@/hooks/useSubgraphQuery";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { TransactionModal } from "@/components/TransactionModal";
import { DualPriceDisplay } from "@/components/DualPriceDisplay";
import { DomaRankBadge } from "@/components/DomaRankBadge";
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
  Eye,
} from "lucide-react";
import { ethers } from "ethers";
import {
  getTokenByAddress,
  getAllSupportedTokens,
  getAllSupportedTokensAsync,
} from "@/config/tokens";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  isDomainToken?: boolean;
  domainMetadata?: {
    image?: string;
    website?: string;
    twitterLink?: string;
  };
}

interface LoanOfferWithDetails extends ProcessedLoan {
  formattedAmount: string;
  formattedCollateralAmount: string;
  formattedInterestRate: number;
  formattedDuration: number;
  statusText: string;
  tokenInfo?: TokenInfo;
  collateralInfo?: TokenInfo;
  currentLoanValueUSD?: string;
  currentCollateralValueUSD?: string;
}

// Function to fetch token information
const fetchTokenInfo = async (
  tokenAddress: string
): Promise<TokenInfo | null> => {
  try {
    const provider = new ethers.JsonRpcProvider(
      DOMA_TESTNET_CONFIG.rpcUrls.default.http[0]
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

  const [supportedTokens, setSupportedTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);

  // Initialize token cache on mount (BEFORE other effects that need token data)
  useEffect(() => {
    console.log("[OffersPage] Initializing token cache...");
    setIsLoadingTokens(true);
    getAllSupportedTokensAsync()
      .then((tokens) => {
        console.log(
          "[OffersPage] Token cache initialized with",
          tokens.length,
          "tokens"
        );
        setSupportedTokens(tokens);
      })
      .catch((error) => {
        console.error("[OffersPage] Failed to initialize token cache:", error);
      })
      .finally(() => {
        setIsLoadingTokens(false);
      });
  }, []);

  // Use subgraph data instead of RPC calls
  const {
    loans: allLoans,
    loading: isLoadingSubgraph,
    error: subgraphError,
  } = useAllLoansWithStatus();

  // Filter for pending loans only AND exclude loans with unavailable domain tokens
  const pendingLoans = React.useMemo(() => {
    if (supportedTokens.length === 0) return []; // Wait for tokens to be loaded

    const validTokenAddresses = new Set(
      supportedTokens.map((t) => t.address.toLowerCase())
    );

    return allLoans.filter((loan) => {
      // Must be pending
      if (loan.status !== 0) return false;

      // Check if both loan token and collateral token are still available
      const loanTokenValid = validTokenAddresses.has(
        loan.tokenAddress.toLowerCase()
      );
      const collateralTokenValid = validTokenAddresses.has(
        loan.collateralAddress.toLowerCase()
      );

      // Log if filtering out due to unavailable tokens
      if (!loanTokenValid || !collateralTokenValid) {
        console.log(
          `[OffersPage] Filtering out loan ${loan.id}: Token not available`,
          {
            loanToken: loan.tokenAddress,
            loanTokenValid,
            collateralToken: loan.collateralAddress,
            collateralTokenValid,
          }
        );
      }

      return loanTokenValid && collateralTokenValid;
    });
  }, [allLoans, supportedTokens]);

  // Get token prices (handles both standard and Doma oracle prices)
  const {
    prices,
    isLoading: isLoadingPrices,
    error: pricesError,
    refreshPrices,
  } = useTokenPrices(supportedTokens);

  const [selectedLoanId, setSelectedLoanId] = useState<bigint | null>(null);
  const [showStuckMessage, setShowStuckMessage] = useState(false);
  const { data: protocolStats, loading: isLoadingProtocolStats } =
    useProtocolStatsCollection();
  const [backendStats, setBackendStats] = useState<{
    totalLoanVolumeUSD: string;
    totalLoansCreated: string;
  } | null>(null);

  // Fetch backend health stats for total volume
  React.useEffect(() => {
    const fetchBackendStats = async () => {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/health`);
        if (response.ok) {
          const data = await response.json();
          const totalLoansCreated =
            data.indexer?.stats?.totalLoansCreated || "0";
          const totalLoanVolumeUSD =
            data.indexer?.stats?.totalLoanVolumeUSD || "0";

          setBackendStats({
            totalLoanVolumeUSD,
            totalLoansCreated,
          });
          console.log("✅ Fetched backend stats:", {
            totalLoanVolumeUSD,
            totalLoansCreated,
          });
        }
      } catch (error) {
        console.warn("Failed to fetch backend stats:", error);
      }
    };

    fetchBackendStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBackendStats, 30000);
    return () => clearInterval(interval);
  }, []);

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
    // Debug: Log available prices
    if (prices.size > 0) {
      console.log("📊 Available prices:", Array.from(prices.keys()));
    }

    return pendingLoans.map((loan) => {
      const tokenInfo = getTokenByAddress(loan.tokenAddress);
      const collateralInfo = getTokenByAddress(loan.collateralAddress);

      const formattedAmount = tokenInfo
        ? ethers.formatUnits(loan.amount, tokenInfo.decimals)
        : ethers.formatEther(loan.amount);

      const formattedCollateralAmount = collateralInfo
        ? ethers.formatUnits(loan.collateralAmount, collateralInfo.decimals)
        : ethers.formatEther(loan.collateralAmount);

      // Calculate USD values from prices
      const tokenAddressLower = loan.tokenAddress.toLowerCase();
      const collateralAddressLower = loan.collateralAddress.toLowerCase();

      console.log(`🔍 Looking for token price: ${tokenAddressLower}`);
      console.log(`🔍 Looking for collateral price: ${collateralAddressLower}`);

      const tokenPrice = prices.get(tokenAddressLower);
      const collateralPrice = prices.get(collateralAddressLower);

      if (tokenPrice) {
        console.log(`✅ Found token price:`, tokenPrice);
      } else {
        console.log(`❌ Token price not found for ${tokenAddressLower}`);
      }

      if (collateralPrice) {
        console.log(`✅ Found collateral price:`, collateralPrice);
      } else {
        console.log(
          `❌ Collateral price not found for ${collateralAddressLower}`
        );
      }

      const currentLoanValueUSD = tokenPrice
        ? (
            parseFloat(formattedAmount) * parseFloat(tokenPrice.priceUSD)
          ).toFixed(2)
        : "0.00";

      const currentCollateralValueUSD = collateralPrice
        ? (
            parseFloat(formattedCollateralAmount) *
            parseFloat(collateralPrice.priceUSD)
          ).toFixed(2)
        : "0.00";

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
        currentLoanValueUSD,
        currentCollateralValueUSD,
      };
    });
  }, [pendingLoans, prices]);

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
      // Refresh prices after successful acceptance
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
      // Refresh prices after successful cancellation
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section with Innovation Highlights */}
      <div className="mb-8 space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-primary to-purple-400 bg-clip-text text-transparent">
              AI-Powered Loan Marketplace
            </h1>
            <p className="text-muted-foreground text-lg">
              The world's first lending platform with AI-driven domain asset
              valuation
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={isLoadingSubgraph || isLoadingPrices}
              className="btn-premium"
            >
              {isLoadingSubgraph || isLoadingPrices ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
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

      {isLoadingSubgraph || isLoadingPrices || isLoadingTokens ? (
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
                  $
                  {Number(
                    protocolStats?.protocolStats_collection?.[0]
                      ?.totalLoanVolumeUSD ||
                      backendStats?.totalLoanVolumeUSD ||
                      "0"
                  ).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {backendStats?.totalLoansCreated ||
                    protocolStats?.protocolStats_collection?.[0]
                      ?.totalLoansCreated ||
                    "0"}{" "}
                  loans • Real-time indexer
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
                  <span className="text-sm font-medium">Total Loans</span>
                </div>
                <p className="text-2xl font-bold">
                  {backendStats?.totalLoansCreated ||
                    protocolStats?.protocolStats_collection?.[0]
                      ?.totalLoansCreated ||
                    "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All-time created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Available Offers</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{formattedLoans.length}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total pending loan offers
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Premium Offers Table */}
          <Card className="luxury-shadow-lg glass border-2 border-primary/20">
            <CardHeader className="gradient-bg border-b-2 border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      Live Loan Offers
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 animate-pulse">
                        LIVE
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span className="font-medium text-foreground/70">
                        {formattedLoans.length} AI-analyzed offer
                        {formattedLoans.length !== 1 ? "s" : ""} available
                      </span>
                      <span className="text-xs text-cyan-400 flex items-center gap-1 ml-2">
                        <Eye className="h-3 w-3" />
                        Click for detailed AI insights
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 bg-muted/30">
                      <TableHead className="font-bold text-foreground pl-6">
                        Loan Asset
                      </TableHead>
                      <TableHead className="font-bold text-foreground">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-cyan-500" />
                          AI Price
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-foreground">
                        Terms
                      </TableHead>
                      <TableHead className="font-bold text-foreground">
                        Collateral
                      </TableHead>
                      <TableHead className="font-bold text-foreground pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formattedLoans.map((loan, index) => (
                      <TableRow
                        key={loan.id.toString()}
                        className={`
                          border-border/30 hover:bg-gradient-to-r hover:from-emerald-500/10 hover:via-teal-500/10 hover:to-cyan-500/10 
                          transition-all duration-500 group cursor-pointer hover:shadow-xl hover:scale-[1.01] hover:border-emerald-400/30
                          ${index % 2 === 0 ? "bg-muted/10" : "bg-background"}
                        `}
                        onClick={() =>
                          (window.location.href = `/offers/${loan.id.toString()}`)
                        }
                      >
                        {/* Loan Asset Column */}
                        <TableCell className="pl-6 py-6">
                          <div className="flex items-center gap-4">
                            {/* Token Image */}
                            <div className="relative">
                              {loan.tokenInfo?.domainMetadata?.image ? (
                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-lg flex-shrink-0 relative group-hover:border-cyan-400 transition-all">
                                  <img
                                    src={loan.tokenInfo.domainMetadata.image}
                                    alt={loan.tokenInfo.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-primary/30">
                                  <DollarSign className="h-8 w-8 text-primary" />
                                </div>
                              )}
                              {/* AI Badge */}
                              {loan.tokenInfo?.isDomainToken && (
                                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border-2 border-background">
                                  AI
                                </div>
                              )}
                            </div>

                            {/* Token Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-2xl font-bold text-foreground">
                                  {parseFloat(loan.formattedAmount).toFixed(2)}
                                </p>
                                <span className="text-lg font-semibold text-primary">
                                  {loan.tokenInfo?.symbol || "TOKEN"}
                                </span>
                              </div>
                              <p className="text-lg font-bold text-green-600 mb-1">
                                ${loan.currentLoanValueUSD} USD
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {loan.tokenInfo?.name ||
                                  `Token ${loan.tokenAddress.slice(0, 8)}...`}
                              </p>

                              {/* DomaRank Badge for domain tokens */}
                              {loan.tokenInfo?.isDomainToken && (
                                <div className="mt-2">
                                  <DomaRankBadge
                                    score={
                                      prices.get(
                                        loan.tokenAddress.toLowerCase()
                                      )?.domaRankScore || 0
                                    }
                                    size="sm"
                                    showTooltip={true}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* AI Price Column */}
                        <TableCell className="py-6">
                          <div className="space-y-2">
                            <DualPriceDisplay
                              price={prices.get(
                                loan.tokenAddress.toLowerCase()
                              )}
                              showLabel={false}
                              className="text-base font-semibold"
                            />
                            <div className="flex items-center gap-1 text-xs text-cyan-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                              <span className="font-medium">Live Oracle</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Terms Column */}
                        <TableCell className="py-6">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Interest APR
                              </p>
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-base font-bold px-3 py-1">
                                {loan.formattedInterestRate.toFixed(2)}%
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Duration
                              </p>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-orange-500" />
                                <span className="font-bold text-foreground">
                                  {Math.round(loan.formattedDuration)} days
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Collateral Column */}
                        <TableCell className="py-6">
                          <div className="flex items-center gap-3">
                            {/* Collateral Image */}
                            <div className="relative">
                              {loan.collateralInfo?.domainMetadata?.image ? (
                                <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-purple-500/50 shadow-md flex-shrink-0 group-hover:border-purple-400 transition-all">
                                  <img
                                    src={
                                      loan.collateralInfo.domainMetadata.image
                                    }
                                    alt={loan.collateralInfo.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border-2 border-purple-500/30">
                                  <Shield className="h-6 w-6 text-purple-500" />
                                </div>
                              )}
                              {/* AI Badge */}
                              {loan.collateralInfo?.isDomainToken && (
                                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-background">
                                  AI
                                </div>
                              )}
                            </div>

                            {/* Collateral Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-bold text-foreground mb-1">
                                {parseFloat(
                                  loan.formattedCollateralAmount
                                ).toFixed(2)}{" "}
                                <span className="text-sm text-primary">
                                  {loan.collateralInfo?.symbol || "TOKEN"}
                                </span>
                              </p>
                              <p className="text-sm font-bold text-blue-600 mb-1">
                                ${loan.currentCollateralValueUSD}
                              </p>

                              {/* DomaRank for collateral */}
                              {loan.collateralInfo?.isDomainToken && (
                                <div className="mt-1">
                                  <DomaRankBadge
                                    score={
                                      prices.get(
                                        loan.collateralAddress.toLowerCase()
                                      )?.domaRankScore || 0
                                    }
                                    size="sm"
                                    showTooltip={true}
                                  />
                                </div>
                              )}

                              {/* AI Price */}
                              <div className="mt-1">
                                <DualPriceDisplay
                                  price={prices.get(
                                    loan.collateralAddress.toLowerCase()
                                  )}
                                  showLabel={false}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Actions Column */}
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className="pr-6 py-6"
                        >
                          <div className="flex flex-col gap-2">
                            {loan.lender.toLowerCase() ===
                            address?.toLowerCase() ? (
                              <>
                                <Badge className="bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0 justify-center">
                                  Your Offer
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelOffer(loan);
                                  }}
                                  disabled={
                                    transactionState.isLoading ||
                                    loan.status !== LoanStatus.Pending ||
                                    (selectedLoanId !== null &&
                                      selectedLoanId !== loan.id)
                                  }
                                  className="w-full btn-premium"
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
                              </>
                            ) : (
                              <Button
                                size="lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptOffer(loan);
                                }}
                                disabled={
                                  transactionState.isLoading ||
                                  loan.status !== LoanStatus.Pending ||
                                  (selectedLoanId !== null &&
                                    selectedLoanId !== loan.id)
                                }
                                className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-600 hover:via-blue-700 hover:to-purple-700 text-white font-bold text-base py-6 shadow-xl hover:shadow-2xl transition-all btn-premium"
                              >
                                {transactionState.isLoading &&
                                  selectedLoanId === loan.id && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                {transactionState.step === "approving" &&
                                selectedLoanId === loan.id
                                  ? "Approving..."
                                  : transactionState.step === "accepting" &&
                                      selectedLoanId === loan.id
                                    ? "Accepting..."
                                    : "Accept Loan"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/offers/${loan.id.toString()}`;
                              }}
                              className="w-full btn-cyan border-2"
                            >
                              <Eye className="mr-2 h-3 w-3" />
                              View AI Analysis
                            </Button>
                          </div>
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
