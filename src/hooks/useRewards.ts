"use client";

import { useState, useEffect, useCallback } from "react";
import { Eip1193Provider, ethers } from "ethers";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { toast } from "sonner";
import {
  REWARDS_DISTRIBUTOR_ADDRESS,
  REWARDS_DISTRIBUTOR_ABI,
  DREAMER_TOKEN_ADDRESS,
  DREAMER_TOKEN_ABI,
  SOMNIA_TESTNET_CONFIG,
} from "@/lib/contracts";

export interface RewardInfo {
  activePrincipal: bigint;
  pendingRewards: bigint;
  lastUpdate: bigint;
}

export interface GlobalRewardStats {
  totalPrincipal: bigint;
  currentAPR: bigint;
  totalDistributed: bigint;
  contractBalance: bigint;
}

export function useRewards() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");

  // State management
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [dreamBalance, setDreamBalance] = useState<bigint>(0n);
  const [pendingRewards, setPendingRewards] = useState<bigint>(0n);
  const [userRewardInfo, setUserRewardInfo] = useState<
    RewardInfo | undefined
  >();
  const [globalRewardStats, setGlobalRewardStats] = useState<
    GlobalRewardStats | undefined
  >();
  const [currentRewardsAPR, setCurrentRewardsAPR] = useState<bigint>(0n);
  const [rewardsPaused, setRewardsPaused] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  // Check if rewards system is available
  const rewardsSystemAvailable =
    REWARDS_DISTRIBUTOR_ADDRESS !==
      "0x0000000000000000000000000000000000000000" &&
    DREAMER_TOKEN_ADDRESS !== "0x0000000000000000000000000000000000000000";

  // Create ethers provider and signer
  const getProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(
      SOMNIA_TESTNET_CONFIG.rpcUrls.default.http[0]
    );
  }, []);

  const getSigner = useCallback(async () => {
    if (!walletProvider) throw new Error("Wallet not connected");
    const ethersProvider = new ethers.BrowserProvider(walletProvider);
    return await ethersProvider.getSigner();
  }, [walletProvider]);

  // Create contract instances
  const getDreamerTokenContract = useCallback(() => {
    const provider = getProvider();
    return new ethers.Contract(
      DREAMER_TOKEN_ADDRESS,
      DREAMER_TOKEN_ABI,
      provider
    );
  }, [getProvider]);

  const getRewardsDistributorContract = useCallback(() => {
    const provider = getProvider();
    return new ethers.Contract(
      REWARDS_DISTRIBUTOR_ADDRESS,
      REWARDS_DISTRIBUTOR_ABI,
      provider
    );
  }, [getProvider]);

  const getRewardsDistributorWriteContract = useCallback(async () => {
    const signer = await getSigner();
    return new ethers.Contract(
      REWARDS_DISTRIBUTOR_ADDRESS,
      REWARDS_DISTRIBUTOR_ABI,
      signer
    );
  }, [getSigner]);

  // Fetch all reward data
  const fetchRewardData = useCallback(async () => {
    if (!isConnected || !address || !rewardsSystemAvailable) return;

    try {
      const dreamerContract = getDreamerTokenContract();
      const rewardsContract = getRewardsDistributorContract();

      // Fetch all data in parallel
      const [balance, pending, userInfo, globalStats, rewardsAPR, paused] =
        await Promise.all([
          dreamerContract.balanceOf(address),
          rewardsContract.getPendingRewards(address),
          rewardsContract.getUserRewardInfo(address),
          rewardsContract.getGlobalRewardStats(),
          rewardsContract.getCurrentRewardsAPR(),
          rewardsContract.rewardsPaused(),
        ]);

      setDreamBalance(balance);
      setPendingRewards(pending);
      setUserRewardInfo({
        activePrincipal: userInfo[0],
        pendingRewards: userInfo[1],
        lastUpdate: userInfo[2],
      });
      setGlobalRewardStats({
        totalPrincipal: globalStats[0],
        currentAPR: globalStats[1],
        totalDistributed: globalStats[2],
        contractBalance: globalStats[3],
      });
      setCurrentRewardsAPR(rewardsAPR);
      setRewardsPaused(paused);
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error("Error fetching reward data:", error);
    }
  }, [
    isConnected,
    address,
    rewardsSystemAvailable,
    getDreamerTokenContract,
    getRewardsDistributorContract,
  ]);

  // Auto-refresh data
  useEffect(() => {
    if (!isConnected || !address || !rewardsSystemAvailable) return;

    // Initial fetch
    fetchRewardData();

    // Set up intervals for different data types
    const pendingRewardsInterval = setInterval(() => {
      if (isConnected && address && rewardsSystemAvailable) {
        fetchRewardData();
      }
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(pendingRewardsInterval);
    };
  }, [isConnected, address, rewardsSystemAvailable, fetchRewardData]);

  // Claim rewards function
  const claimRewards = useCallback(async () => {
    if (!isConnected || !address || !rewardsSystemAvailable) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!pendingRewards || pendingRewards === 0n) {
      toast.error("No rewards to claim");
      return;
    }

    if (rewardsPaused) {
      toast.error("Rewards distribution is currently paused");
      return;
    }

    try {
      setIsClaimingRewards(true);

      const rewardsContract = await getRewardsDistributorWriteContract();
      const tx = await rewardsContract.claimRewards();

      toast.success("Claiming rewards...", {
        description: "Transaction submitted. Please wait for confirmation.",
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast.success("Rewards claimed successfully!", {
          description: "DREAM tokens have been transferred to your wallet.",
        });

        // Refresh reward data
        fetchRewardData();
      } else {
        throw new Error("Transaction failed");
      }

      setIsClaimingRewards(false);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.error("Failed to claim rewards", {
        description:
          (error as Error)?.message || "An unexpected error occurred",
      });
      setIsClaimingRewards(false);
    }
  }, [
    isConnected,
    address,
    pendingRewards,
    rewardsPaused,
    rewardsSystemAvailable,
    getRewardsDistributorWriteContract,
    fetchRewardData,
  ]);

  // Format functions
  const formatDreamAmount = useCallback((amount: bigint | undefined) => {
    if (!amount) return "0";
    return ethers.formatUnits(amount, 18);
  }, []);

  const formatAPR = useCallback((apr: bigint | undefined) => {
    if (!apr) return "0";
    return (Number(apr) / 100).toFixed(2); // Convert from basis points to percentage
  }, []);

  // Calculate estimated daily rewards
  const estimatedDailyRewards = useCallback(() => {
    if (!userRewardInfo || !globalRewardStats || !rewardsSystemAvailable)
      return "0";

    const { activePrincipal } = userRewardInfo;
    const { totalPrincipal } = globalRewardStats;

    if (totalPrincipal === 0n || activePrincipal === 0n) return "0";

    // Simplified calculation: user's share of daily rewards
    // This is an approximation since actual rewards depend on real-time participation
    const userShare = Number(activePrincipal) / Number(totalPrincipal);
    const dailyEmission = 86400; // 86400 seconds per day * 1 DREAM per second
    const estimatedDaily = dailyEmission * userShare;

    return estimatedDaily.toFixed(4);
  }, [userRewardInfo, globalRewardStats, rewardsSystemAvailable]);

  return {
    // System status
    rewardsSystemAvailable,
    rewardsPaused,

    // User data
    dreamBalance,
    pendingRewards,
    userRewardInfo,

    // Global data
    globalRewardStats,
    currentRewardsAPR,

    // Actions
    claimRewards,

    // Status
    isClaimingRewards,
    canClaimRewards: !!(
      pendingRewards &&
      pendingRewards > 0n &&
      !rewardsPaused
    ),

    // Formatters
    formatDreamAmount,
    formatAPR,
    estimatedDailyRewards,

    // Refetch functions
    refetchRewards: fetchRewardData,
  };
}
