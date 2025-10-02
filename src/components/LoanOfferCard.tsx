"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useP2PLending } from "@/hooks/useP2PLending";
import { useRewards } from "@/hooks/useRewards";
import { Loan } from "@/lib/contracts";
import {
  Clock,
  DollarSign,
  Shield,
  TrendingUp,
  Gift,
  Plus,
  AlertCircle,
} from "lucide-react";
import { ethers } from "ethers";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

interface LoanOfferCardProps {
  loan: Loan;
  tokenInfo?: TokenInfo;
  collateralInfo?: TokenInfo;
  onAccept?: (loanId: bigint) => void;
  onCancel?: (loanId: bigint) => void;
  isAccepting?: boolean;
  isCancelling?: boolean;
  showAcceptButton?: boolean;
}

export function LoanOfferCard({
  loan,
  tokenInfo,
  collateralInfo,
  onAccept,
  onCancel,
  isAccepting = false,
  isCancelling = false,
  showAcceptButton = true,
}: LoanOfferCardProps) {
  const { isConnected, address } = useP2PLending();
  const {
    currentRewardsAPR,
    formatAPR,
    rewardsSystemAvailable,
    globalRewardStats,
  } = useRewards();

  // Format loan details
  const formatAmount = (amount: bigint, decimals: number = 6) => {
    return parseFloat(ethers.formatUnits(amount, decimals)).toLocaleString();
  };

  const formatInterestRate = (rate: bigint) => {
    return (Number(rate) / 100).toFixed(2);
  };

  const formatDuration = (duration: bigint) => {
    const days = Number(duration) / (24 * 60 * 60);
    return Math.round(days);
  };

  // Calculate rewards APR for this specific loan
  const calculateLoanRewardsAPR = () => {
    if (!rewardsSystemAvailable || !currentRewardsAPR || !globalRewardStats) {
      return "0";
    }

    // For individual loans, we use the global rewards APR
    // In practice, this would be divided among all active participants
    // This is a simplified calculation for display purposes
    const globalAPR = formatAPR(currentRewardsAPR);

    // Estimate user's potential share (this is approximate)
    // In reality, it depends on total active principal when the loan becomes active
    const estimatedUserShare = parseFloat(globalAPR) * 0.5; // Rough estimate

    return estimatedUserShare.toFixed(2);
  };

  const calculateTotalAPR = () => {
    const interestAPR = parseFloat(formatInterestRate(loan.interestRate));
    const rewardsAPR = parseFloat(calculateLoanRewardsAPR());
    return (interestAPR + rewardsAPR).toFixed(2);
  };

  const loanRewardsAPR = calculateLoanRewardsAPR();
  const totalAPR = calculateTotalAPR();
  const interestAPR = formatInterestRate(loan.interestRate);

  const canAcceptLoan = isConnected && address && address !== loan.lender;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Loan #{loan.id.toString()}
            </CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {tokenInfo?.symbol || "Token"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatDuration(loan.duration)} days
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {totalAPR}% APR
            </div>
            <div className="text-xs text-muted-foreground">Total Return</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* APR Breakdown */}
        {rewardsSystemAvailable && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                APR Breakdown
              </h4>
              <Gift className="h-4 w-4 text-purple-500" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-sm">Interest APR</span>
                </div>
                <span className="text-sm font-medium">{interestAPR}%</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Gift className="h-3 w-3 text-purple-500" />
                  <span className="text-sm">Rewards APR</span>
                </div>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  +{loanRewardsAPR}%
                </span>
              </div>

              <Separator className="my-2" />

              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Total APR</span>
                <span className="text-sm font-bold text-green-600">
                  {totalAPR}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loan Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Loan Amount</div>
                <div className="text-lg font-semibold">
                  {formatAmount(loan.amount, tokenInfo?.decimals)}{" "}
                  {tokenInfo?.symbol}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm font-medium">Duration</div>
                <div className="text-lg font-semibold">
                  {formatDuration(loan.duration)} days
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">Collateral</div>
                <div className="text-lg font-semibold">
                  {formatAmount(
                    loan.collateralAmount,
                    collateralInfo?.decimals
                  )}{" "}
                  {collateralInfo?.symbol}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm font-medium">Base Interest</div>
                <div className="text-lg font-semibold">{interestAPR}% APR</div>
              </div>
            </div>
          </div>
        </div>

        {/* Rewards Info */}
        {rewardsSystemAvailable && loanRewardsAPR !== "0" && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Gift className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>Liquidity Mining:</strong> Both lenders and borrowers
                earn additional {loanRewardsAPR}% APR in DREAM tokens while this
                loan is active. Rewards accrue in real-time!
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showAcceptButton && (
          <div className="pt-4 border-t">
            {!isConnected ? (
              <Button disabled className="w-full">
                Connect Wallet to Accept
              </Button>
            ) : loan.lender.toLowerCase() === address?.toLowerCase() ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <Badge variant="outline" className="text-sm">
                    Your Loan Offer
                  </Badge>
                </div>
                <Button
                  onClick={() => onCancel?.(loan.id)}
                  disabled={isCancelling}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  {isCancelling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Cancel Offer
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => onAccept?.(loan.id)}
                disabled={isAccepting}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                size="lg"
              >
                {isAccepting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Accept Loan Offer
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Lender Info */}
        <div className="text-xs text-muted-foreground">
          <span>Lender: </span>
          <span className="font-mono">
            {loan.lender.slice(0, 6)}...{loan.lender.slice(-4)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
