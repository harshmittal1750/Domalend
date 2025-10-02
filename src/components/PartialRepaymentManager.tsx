"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useP2PLending } from "@/hooks/useP2PLending";
import { Loan } from "@/lib/contracts";
import { invalidateSubgraphCache } from "@/hooks/useSubgraphQuery";
import {
  DollarSign,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  TrendingDown,
} from "lucide-react";
import { ethers } from "ethers";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

interface PartialRepaymentManagerProps {
  loan: Loan;
  tokenInfo?: TokenInfo;
  onUpdate?: () => void;
}

export function PartialRepaymentManager({
  loan,
  tokenInfo,
  onUpdate,
}: PartialRepaymentManagerProps) {
  const {
    makePartialRepayment,
    getLoanRepaymentInfo,
    transactionState,
    isConnected,
    address,
  } = useP2PLending();

  const [repaymentInfo, setRepaymentInfo] = useState<{
    totalOwed: bigint;
    repaidAmount: bigint;
    remainingAmount: bigint;
    interestAccrued: bigint;
  } | null>(null);

  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch repayment data
  const fetchRepaymentData = async () => {
    if (loan.status !== 1) return; // Only for active loans

    try {
      setIsLoading(true);
      const info = await getLoanRepaymentInfo(loan.id);
      setRepaymentInfo(info);
    } catch (error) {
      console.error("Failed to fetch repayment data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepaymentData();
  }, [loan.id, loan.status]);

  const handlePartialRepayment = async () => {
    if (!repaymentAmount || !isConnected || !repaymentInfo) return;

    try {
      const decimals = tokenInfo?.decimals || 6;
      const amount = ethers.parseUnits(repaymentAmount, decimals);

      // Validate amount
      if (amount > repaymentInfo.remainingAmount) {
        alert("Repayment amount cannot exceed remaining debt");
        return;
      }

      await makePartialRepayment(loan.id, amount, loan);
      setRepaymentAmount("");
      // Invalidate cache to force fresh data
      invalidateSubgraphCache();
      await fetchRepaymentData();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to make partial repayment:", error);
    }
  };

  // Only show for active loans and if user is the borrower
  if (
    loan.status !== 1 ||
    !address ||
    loan.borrower.toLowerCase() !== address.toLowerCase()
  ) {
    return null;
  }

  const formatAmount = (amount: bigint, decimals: number = 6) => {
    return parseFloat(ethers.formatUnits(amount, decimals)).toLocaleString();
  };

  const tokenDecimals = tokenInfo?.decimals || 6;
  const tokenSymbol = tokenInfo?.symbol || "TOKEN";

  // Calculate repayment progress
  const repaymentProgress = repaymentInfo
    ? Number((repaymentInfo.repaidAmount * 100n) / repaymentInfo.totalOwed)
    : 0;

  // Quick repayment amounts (25%, 50%, 75%, 100% of remaining)
  const getQuickAmount = (percentage: number) => {
    if (!repaymentInfo) return "";
    const amount = (repaymentInfo.remainingAmount * BigInt(percentage)) / 100n;
    return ethers.formatUnits(amount, tokenDecimals);
  };

  return (
    <Card className="luxury-shadow">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <span>Partial Repayment</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRepaymentData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repayment Overview */}
        {repaymentInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/2 border border-primary/20 rounded-xl">
                <div className="text-sm text-muted-foreground mb-2">
                  Principal
                </div>
                <div className="text-lg font-semibold text-primary">
                  {formatAmount(loan.amount, tokenDecimals)} {tokenSymbol}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-50/50 to-amber-25/30 dark:from-amber-900/10 dark:to-amber-900/5 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
                <div className="text-sm text-muted-foreground mb-2">
                  Interest Accrued
                </div>
                <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  +{formatAmount(repaymentInfo.interestAccrued, tokenDecimals)}{" "}
                  {tokenSymbol}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Owed</span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {formatAmount(repaymentInfo.totalOwed, tokenDecimals)}{" "}
                  {tokenSymbol}
                </Badge>
              </div>

              {repaymentInfo.repaidAmount > 0n && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Already Repaid
                    </span>
                    <span className="text-green-600">
                      -{formatAmount(repaymentInfo.repaidAmount, tokenDecimals)}{" "}
                      {tokenSymbol}
                    </span>
                  </div>

                  <Progress value={repaymentProgress} className="h-2" />

                  <div className="text-center text-xs text-muted-foreground">
                    {repaymentProgress.toFixed(1)}% repaid
                  </div>
                </>
              )}

              <div className="flex justify-between items-center p-4 bg-gradient-to-br from-emerald-50/50 to-emerald-25/30 dark:from-emerald-900/10 dark:to-emerald-900/5 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Remaining
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatAmount(repaymentInfo.remainingAmount, tokenDecimals)}{" "}
                  {tokenSymbol}
                </span>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Repayment Input */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Make Partial Repayment</span>
          </h4>

          <div className="space-y-3">
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="0.0"
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handlePartialRepayment}
                disabled={
                  !repaymentAmount ||
                  transactionState.isLoading ||
                  !repaymentInfo
                }
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Repay
              </Button>
            </div>

            {/* Quick Amount Buttons */}
            {repaymentInfo && (
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percentage) => (
                  <Button
                    key={percentage}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRepaymentAmount(getQuickAmount(percentage))
                    }
                    className="text-xs border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                  >
                    {percentage}%
                  </Button>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Partial repayments reduce your total debt and interest burden
            </div>
          </div>
        </div>

        {/* Benefits Info */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <TrendingDown className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-green-700 dark:text-green-300 mb-1">
                Benefits of Partial Repayment
              </div>
              <ul className="text-green-600 dark:text-green-400 text-xs space-y-1">
                <li>• Reduces total interest paid over time</li>
                <li>• Improves loan health factor</li>
                <li>• Flexible repayment schedule</li>
                <li>• No prepayment penalties</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {transactionState.isLoading && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {transactionState.step === "partial_repaying" &&
                "Processing partial repayment..."}
              {transactionState.step === "approving" && "Approving tokens..."}
            </span>
          </div>
        )}

        {transactionState.isSuccess && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Partial repayment completed successfully!
            </span>
          </div>
        )}

        {transactionState.isError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700 dark:text-red-300">
              {transactionState.error}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
