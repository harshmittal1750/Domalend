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
  Shield,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { ethers } from "ethers";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

interface LoanHealthManagerProps {
  loan: Loan;
  tokenInfo?: TokenInfo;
  collateralInfo?: TokenInfo;
  onUpdate?: () => void;
}

export function LoanHealthManager({
  loan,
  tokenInfo,
  collateralInfo,
  onUpdate,
}: LoanHealthManagerProps) {
  const {
    addCollateral,
    removeCollateral,
    getLoanHealthFactor,
    getLoanRepaymentInfo,
    transactionState,
    isConnected,
    address,
  } = useP2PLending();

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

  const [addAmount, setAddAmount] = useState("");
  const [removeAmount, setRemoveAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch health data
  const fetchHealthData = async () => {
    if (loan.status !== 1) return; // Only for active loans

    try {
      setIsLoading(true);
      const [health, repayment] = await Promise.all([
        getLoanHealthFactor(loan.id),
        getLoanRepaymentInfo(loan.id),
      ]);
      setHealthData(health);
      setRepaymentInfo(repayment);
    } catch (error) {
      console.error("Failed to fetch health data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, [loan.id, loan.status]);

  const handleAddCollateral = async () => {
    if (!addAmount || !isConnected) return;

    try {
      const decimals = collateralInfo?.decimals || 6;
      const amount = ethers.parseUnits(addAmount, decimals);
      await addCollateral(loan.id, amount);
      setAddAmount("");
      // Invalidate cache to force fresh data
      invalidateSubgraphCache();
      await fetchHealthData();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to add collateral:", error);
    }
  };

  const handleRemoveCollateral = async () => {
    if (!removeAmount || !isConnected) return;

    try {
      const decimals = collateralInfo?.decimals || 6;
      const amount = ethers.parseUnits(removeAmount, decimals);
      await removeCollateral(loan.id, amount);
      setRemoveAmount("");
      // Invalidate cache to force fresh data
      invalidateSubgraphCache();
      await fetchHealthData();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to remove collateral:", error);
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

  const collateralDecimals = collateralInfo?.decimals || 6;
  const tokenDecimals = tokenInfo?.decimals || 6;

  // Calculate health factor percentage (150% = healthy, 120% = liquidation threshold)
  const healthPercentage = healthData
    ? Math.min(Number(healthData.currentRatio) / 100, 300) // Cap at 300% for display
    : 0;

  const isHealthy = healthPercentage >= 150;
  const isAtRisk = healthPercentage < 130 && healthPercentage >= 120;
  const isDangerous = healthPercentage < 120;

  const getHealthColor = () => {
    if (isDangerous) return "text-red-600";
    if (isAtRisk) return "text-yellow-600";
    return "text-green-600";
  };

  const getHealthBgColor = () => {
    if (isDangerous) return "bg-red-100 dark:bg-red-900/20";
    if (isAtRisk) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-green-100 dark:bg-green-900/20";
  };

  return (
    <Card className="luxury-shadow">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Loan Health Management</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHealthData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Factor Display */}
        {healthData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Health Factor</span>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className={`${getHealthBgColor()} ${getHealthColor()}`}
                >
                  {healthPercentage.toFixed(1)}%
                </Badge>
                {isHealthy && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {isAtRisk && (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                {isDangerous && (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>

            <Progress
              value={Math.min(healthPercentage, 200)}
              max={200}
              className="h-2"
            />

            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="text-red-600">Liquidation</div>
                <div>120%</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-600">At Risk</div>
                <div>130%</div>
              </div>
              <div className="text-center">
                <div className="text-green-600">Healthy</div>
                <div>150%+</div>
              </div>
            </div>

            {healthData.priceStale && (
              <div className="flex items-center space-x-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  Price data is stale. Health factor may not be accurate.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Repayment Progress */}
        {repaymentInfo && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Repayment Progress</span>
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gradient-to-br from-primary/5 to-primary/2 border border-primary/20 rounded-lg">
                <div className="text-muted-foreground mb-1">Total Owed</div>
                <div className="font-semibold text-primary">
                  {formatAmount(repaymentInfo.totalOwed, tokenDecimals)}{" "}
                  {tokenInfo?.symbol}
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-50/50 to-emerald-25/30 dark:from-emerald-900/10 dark:to-emerald-900/5 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg">
                <div className="text-muted-foreground mb-1">Remaining</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatAmount(repaymentInfo.remainingAmount, tokenDecimals)}{" "}
                  {tokenInfo?.symbol}
                </div>
              </div>
            </div>

            {repaymentInfo.repaidAmount > 0n && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Repaid</span>
                  <span>
                    {formatAmount(repaymentInfo.repaidAmount, tokenDecimals)}{" "}
                    {tokenInfo?.symbol}
                  </span>
                </div>
                <Progress
                  value={Number(
                    (repaymentInfo.repaidAmount * 100n) /
                      repaymentInfo.totalOwed
                  )}
                  className="h-2"
                />
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Collateral Management */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Manage Collateral</h4>

          <div className="p-3 bg-gradient-to-br from-violet-50/50 to-violet-25/30 dark:from-violet-900/10 dark:to-violet-900/5 border border-violet-200/60 dark:border-violet-800/40 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">
              Current Collateral
            </div>
            <div className="font-semibold text-violet-600 dark:text-violet-400">
              {formatAmount(loan.collateralAmount, collateralDecimals)}{" "}
              {collateralInfo?.symbol}
            </div>
          </div>

          {/* Add Collateral */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-green-600">
              Add Collateral
            </label>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="0.0"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAddCollateral}
                disabled={!addAmount || transactionState.isLoading}
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Remove Collateral */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-orange-600">
              Remove Collateral
            </label>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="0.0"
                value={removeAmount}
                onChange={(e) => setRemoveAmount(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleRemoveCollateral}
                disabled={!removeAmount || transactionState.isLoading}
                size="sm"
                variant="outline"
                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-600 transition-all duration-200"
              >
                <Minus className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Removal must maintain minimum health factor
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {transactionState.isLoading && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {transactionState.step === "adding_collateral" &&
                "Adding collateral..."}
              {transactionState.step === "removing_collateral" &&
                "Removing collateral..."}
              {transactionState.step === "approving" && "Approving tokens..."}
            </span>
          </div>
        )}

        {transactionState.isSuccess && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Transaction completed successfully!
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
