"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useP2PLending } from "@/hooks/useP2PLending";

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

  const calculateTotalAPR = () => {
    const interestAPR = parseFloat(formatInterestRate(loan.interestRate));

    return interestAPR.toFixed(2);
  };

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
