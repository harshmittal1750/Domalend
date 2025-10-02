"use client";

import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useRewards } from "@/hooks/useRewards";
import {
  Gift,
  TrendingUp,
  Coins,
  Clock,
  Target,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function RewardsDisplay() {
  const { isConnected } = useAppKitAccount();
  const {
    rewardsSystemAvailable,
    rewardsPaused,
    dreamBalance,
    pendingRewards,
    userRewardInfo,
    globalRewardStats,
    currentRewardsAPR,
    claimRewards,
    isClaimingRewards,
    canClaimRewards,
    formatDreamAmount,
    formatAPR,
    estimatedDailyRewards,
    refetchRewards,
  } = useRewards();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refetchRewards();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Don't show if not connected or rewards system not available
  if (!isConnected || !rewardsSystemAvailable) {
    return null;
  }

  const pendingRewardsFormatted = formatDreamAmount(pendingRewards);
  const dreamBalanceFormatted = formatDreamAmount(dreamBalance);
  const rewardsAPRFormatted = formatAPR(currentRewardsAPR);
  const dailyRewards = estimatedDailyRewards();

  const activePrincipal = userRewardInfo
    ? formatDreamAmount(userRewardInfo.activePrincipal)
    : "0";
  const totalPrincipal = globalRewardStats
    ? formatDreamAmount(globalRewardStats.totalPrincipal)
    : "0";
  const totalDistributed = globalRewardStats
    ? formatDreamAmount(globalRewardStats.totalDistributed)
    : "0";

  // Calculate user's share of the total pool
  const userSharePercentage =
    userRewardInfo && globalRewardStats && globalRewardStats.totalPrincipal > 0n
      ? (
          (Number(userRewardInfo.activePrincipal) /
            Number(globalRewardStats.totalPrincipal)) *
          100
        ).toFixed(2)
      : "0";

  return (
    <Card className="w-full bg-gradient-to-br from-primary/5 via-accent/3 to-success/5 dark:from-primary/3 dark:via-accent/2 dark:to-success/3 border-primary/20 dark:border-primary/10 luxury-shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Gift className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Liquidity Mining Rewards
              </CardTitle>
              <CardDescription className="text-sm">
                Earn $DREAM tokens for lending and borrowing
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {rewardsPaused && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Paused
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Rewards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Rewards */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 " />
              <span className="text-sm font-medium text-muted-foreground">
                Unclaimed Rewards
              </span>
            </div>
            <div className="text-2xl font-bold text-secondary-foreground">
              {Number(pendingRewardsFormatted).toFixed(2)} DREAM
            </div>
            <div className="text-xs text-muted-foreground">
              ≈ ${(parseFloat(pendingRewardsFormatted) * 0.25).toFixed(2)} USD
            </div>
          </div>

          {/* DREAM Balance */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                DREAM Balance
              </span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {Number(dreamBalanceFormatted).toFixed(2)} DREAM
            </div>
            <div className="text-xs text-muted-foreground">
              ≈ ${(parseFloat(dreamBalanceFormatted) * 0.25).toFixed(2)} USD
            </div>
          </div>

          {/* Current APR */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-muted-foreground">
                Rewards APR
              </span>
            </div>
            <div className="text-2xl font-bold text-success">
              {rewardsAPRFormatted}%
            </div>
            <div className="text-xs text-muted-foreground">
              Current emission rate
            </div>
          </div>
        </div>

        {/* Claim Rewards Button */}
        <div className="flex justify-center">
          <Button
            onClick={claimRewards}
            disabled={!canClaimRewards || isClaimingRewards}
            size="lg"
            className="w-full md:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold px-8 py-3 rounded-xl luxury-shadow hover:luxury-shadow-lg transition-all duration-300 btn-premium"
          >
            {isClaimingRewards ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : canClaimRewards ? (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Claim {Number(pendingRewardsFormatted).toFixed(2)} DREAM
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                No Rewards to Claim
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Detailed Stats */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Your Participation
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Active Principal
                </span>
                <span className="text-sm font-medium">
                  {activePrincipal} USD
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Pool Share
                </span>
                <span className="text-sm font-medium">
                  {userSharePercentage}%
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Pool Share
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {userSharePercentage}%
                  </span>
                </div>
                <Progress
                  value={parseFloat(userSharePercentage)}
                  className="h-2"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Estimated Daily
                </span>
                <span className="text-sm font-medium">
                  {dailyRewards} DREAM
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Pool
                </span>
                <span className="text-sm font-medium">
                  {totalPrincipal} USD
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Distributed
                </span>
                <span className="text-sm font-medium">
                  {Number(totalDistributed).toFixed(2)} DREAM
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 dark:from-primary/3 dark:to-accent/3 rounded-lg p-4 glass">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-primary">
                How Rewards Work
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Earn DREAM tokens by participating in active loans as either a
                lender or borrower. Rewards are distributed proportionally based
                on your active principal amount and accrue in real-time while
                your loans are active.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
