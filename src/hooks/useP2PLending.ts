"use client";

import { useState, useCallback, useEffect } from "react";
import { Eip1193Provider, ethers } from "ethers";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import {
  DREAMLEND_CONTRACT_ADDRESS,
  DREAMLEND_ABI,
  ERC20_ABI,
  Loan,
  LoanStatus,
  SOMNIA_TESTNET_CONFIG,
} from "@/lib/contracts";
import { SUPPORTED_TOKENS } from "@/config/tokens";

export interface TransactionState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  hash: string | null;
  step:
    | "idle"
    | "approving"
    | "approved"
    | "creating"
    | "accepting"
    | "repaying"
    | "liquidating"
    | "cancelling"
    | "adding_collateral"
    | "removing_collateral"
    | "partial_repaying"
    | "success"
    | "error";
}

export interface LoanOfferFormData {
  tokenAddress: string;
  amount: string;
  interestRate: string;
  duration: string;
  collateralAddress: string;
  collateralAmount: string;
}

export const useP2PLending = () => {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");

  // State management
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    hash: null,
    step: "idle",
  });

  const [activeLoanOfferIds, setActiveLoanOfferIds] = useState<bigint[]>();
  const [lenderLoans, setLenderLoans] = useState<bigint[]>();
  const [borrowerLoans, setBorrowerLoans] = useState<bigint[]>();
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [isLoadingLenderLoans, setIsLoadingLenderLoans] = useState(false);
  const [isLoadingBorrowerLoans, setIsLoadingBorrowerLoans] = useState(false);

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
  const getReadContract = useCallback(() => {
    const provider = getProvider();
    return new ethers.Contract(
      DREAMLEND_CONTRACT_ADDRESS,
      DREAMLEND_ABI,
      provider
    );
  }, [getProvider]);

  const getWriteContract = useCallback(async () => {
    const signer = await getSigner();
    return new ethers.Contract(
      DREAMLEND_CONTRACT_ADDRESS,
      DREAMLEND_ABI,
      signer
    );
  }, [getSigner]);

  const getERC20Contract = useCallback(
    async (tokenAddress: string, needsSigner = false) => {
      if (needsSigner) {
        const signer = await getSigner();
        return new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      } else {
        const provider = getProvider();
        return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      }
    },
    [getSigner, getProvider]
  );

  // Reset transaction state
  const resetTransactionState = useCallback(() => {
    setTransactionState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      hash: null,
      step: "idle",
    });
  }, []);

  // ============ READ FUNCTIONS ============

  const fetchActiveLoanOffers = useCallback(async () => {
    try {
      setIsLoadingOffers(true);
      const contract = getReadContract();
      const offers = await contract.getActiveLoanOffers();
      setActiveLoanOfferIds(
        offers.map((id: ethers.BigNumberish) => BigInt(id.toString()))
      );
    } catch (error) {
      console.error("Error fetching active loan offers:", error);
    } finally {
      setIsLoadingOffers(false);
    }
  }, [getReadContract]);

  const fetchLenderLoans = useCallback(async () => {
    if (!address) return;
    try {
      setIsLoadingLenderLoans(true);
      const contract = getReadContract();
      const loans = await contract.getLenderLoans(address);
      setLenderLoans(
        loans.map((id: ethers.BigNumberish) => BigInt(id.toString()))
      );
    } catch (error) {
      console.error("Error fetching lender loans:", error);
    } finally {
      setIsLoadingLenderLoans(false);
    }
  }, [address, getReadContract]);

  const fetchBorrowerLoans = useCallback(async () => {
    if (!address) return;
    try {
      setIsLoadingBorrowerLoans(true);
      const contract = getReadContract();
      const loans = await contract.getBorrowerLoans(address);
      setBorrowerLoans(
        loans.map((id: ethers.BigNumberish) => BigInt(id.toString()))
      );
    } catch (error) {
      console.error("Error fetching borrower loans:", error);
    } finally {
      setIsLoadingBorrowerLoans(false);
    }
  }, [address, getReadContract]);

  // Get loan details by ID
  const getLoan = useCallback(
    async (loanId: bigint): Promise<Loan | null> => {
      try {
        const contract = getReadContract();
        const loan = await contract.getLoan(loanId);
        return {
          id: BigInt(loan.id.toString()),
          lender: loan.lender,
          borrower: loan.borrower,
          tokenAddress: loan.tokenAddress,
          amount: BigInt(loan.amount.toString()),
          interestRate: BigInt(loan.interestRate.toString()),
          duration: BigInt(loan.duration.toString()),
          collateralAddress: loan.collateralAddress,
          collateralAmount: BigInt(loan.collateralAmount.toString()),
          startTime: BigInt(loan.startTime.toString()),
          status: loan.status,
          minCollateralRatioBPS: BigInt(
            loan.minCollateralRatioBPS?.toString() || "0"
          ),
          liquidationThresholdBPS: BigInt(
            loan.liquidationThresholdBPS?.toString() || "0"
          ),
          maxPriceStaleness: BigInt(loan.maxPriceStaleness?.toString() || "0"),
          repaidAmount: BigInt(loan.repaidAmount?.toString() || "0"),
        };
      } catch (error) {
        console.error("Error fetching loan details:", error);
        return null;
      }
    },
    [getReadContract]
  );

  // Check ERC20 allowance
  const checkAllowance = useCallback(
    async (
      tokenAddress: string,
      owner: string,
      spender: string
    ): Promise<bigint> => {
      try {
        const contract = await getERC20Contract(tokenAddress, false);
        const allowance = await contract.allowance(owner, spender);
        return BigInt(allowance.toString());
      } catch (error) {
        console.error("Error checking allowance:", error);
        return BigInt(0);
      }
    },
    [getERC20Contract]
  );

  // Check ERC20 balance
  const checkBalance = useCallback(
    async (tokenAddress: string, account: string): Promise<bigint> => {
      try {
        const contract = await getERC20Contract(tokenAddress, false);
        const balance = await contract.balanceOf(account);
        return BigInt(balance.toString());
      } catch (error) {
        console.error("Error checking balance:", error);
        return BigInt(0);
      }
    },
    [getERC20Contract]
  );

  // ============ WRITE FUNCTIONS ============

  // Approve ERC20 tokens
  const approveToken = useCallback(
    async (tokenAddress: string, amount: bigint) => {
      if (!address) throw new Error("Wallet not connected");

      setTransactionState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        hash: null,
        step: "approving",
      });

      try {
        const contract = await getERC20Contract(tokenAddress, true);
        const tx = await contract.approve(DREAMLEND_CONTRACT_ADDRESS, amount);
        await tx.wait();

        setTransactionState((prev) => ({
          ...prev,
          hash: tx.hash,
          step: "approved",
          isLoading: false,
          isSuccess: true,
        }));

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to approve tokens";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [address, getERC20Contract]
  );

  // Create loan offer with two-step process
  const createLoanOffer = useCallback(
    async (formData: LoanOfferFormData) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        // Get token information for proper decimal handling
        const loanToken = Object.values(SUPPORTED_TOKENS).find(
          (token) =>
            token.address.toLowerCase() === formData.tokenAddress.toLowerCase()
        );
        const collateralToken = Object.values(SUPPORTED_TOKENS).find(
          (token) =>
            token.address.toLowerCase() ===
            formData.collateralAddress.toLowerCase()
        );

        if (!loanToken)
          throw new Error("Loan token not found in supported tokens");
        if (!collateralToken)
          throw new Error("Collateral token not found in supported tokens");

        // Convert form data to contract parameters using proper decimals
        const amount = ethers.parseUnits(formData.amount, loanToken.decimals);
        const interestRate = BigInt(formData.interestRate); // Already converted to basis points
        const duration = BigInt(
          Math.floor(parseFloat(formData.duration) * 24 * 60 * 60)
        ); // Convert days to seconds
        const collateralAmount = ethers.parseUnits(
          formData.collateralAmount,
          collateralToken.decimals
        );

        // Debug logging for decimal conversion AND token addresses
        console.log("🚨 LOAN CREATION DEBUG - Token Addresses Being Sent:", {
          formData: {
            tokenAddress: formData.tokenAddress,
            collateralAddress: formData.collateralAddress,
          },
          loanToken: {
            symbol: loanToken.symbol,
            address: loanToken.address,
            decimals: loanToken.decimals,
            inputAmount: formData.amount,
            convertedAmount: amount.toString(),
          },
          collateralToken: {
            symbol: collateralToken.symbol,
            address: collateralToken.address,
            decimals: collateralToken.decimals,
            inputAmount: formData.collateralAmount,
            convertedAmount: collateralAmount.toString(),
          },
          interestRate: {
            inputBasisPoints: formData.interestRate,
            convertedBigInt: interestRate.toString(),
            asPercentage: `${Number(interestRate) / 100}%`,
          },
          contractCallParams: {
            tokenAddress: formData.tokenAddress,
            amount: amount.toString(),
            interestRate: interestRate.toString(),
            duration: duration.toString(),
            collateralAddress: formData.collateralAddress,
            collateralAmount: collateralAmount.toString(),
          },
        });

        // Step 1: Approve tokens
        setTransactionState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
          hash: null,
          step: "approving",
        });

        await approveToken(formData.tokenAddress, amount);

        // Wait a bit for the approval to be processed
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 2: Create loan offer
        setTransactionState((prev) => ({
          ...prev,
          step: "creating",
        }));

        const contract = await getWriteContract();
        const tx = await contract.createLoanOffer(
          formData.tokenAddress,
          amount,
          interestRate,
          duration,
          formData.collateralAddress,
          collateralAmount
        );
        await tx.wait();

        setTransactionState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          hash: tx.hash,
          step: "success",
        });

        // Refetch data
        await fetchActiveLoanOffers();
        await fetchLenderLoans();

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create loan offer";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [
      address,
      getWriteContract,
      approveToken,
      fetchActiveLoanOffers,
      fetchLenderLoans,
    ]
  );

  // Accept loan offer with two-step process
  const acceptLoanOffer = useCallback(
    async (loanId: bigint, loan: Loan) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        // Step 1: Approve collateral tokens
        setTransactionState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
          hash: null,
          step: "approving",
        });

        await approveToken(loan.collateralAddress, loan.collateralAmount);

        // Wait a bit for the approval to be processed
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 2: Accept loan offer
        setTransactionState((prev) => ({
          ...prev,
          step: "accepting",
        }));

        const contract = await getWriteContract();
        const tx = await contract.acceptLoanOffer(loanId);
        await tx.wait();

        setTransactionState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          hash: tx.hash,
          step: "success",
        });

        // Refetch data
        await fetchActiveLoanOffers();
        await fetchBorrowerLoans();

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to accept loan offer";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [
      address,
      getWriteContract,
      approveToken,
      fetchActiveLoanOffers,
      fetchBorrowerLoans,
    ]
  );

  // Repay loan with approval process
  const repayLoan = useCallback(
    async (loanId: bigint, loan: Loan) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        // Calculate total repayment amount
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const timeElapsed = currentTime - loan.startTime;
        const interest =
          (loan.amount * loan.interestRate * timeElapsed) /
          (BigInt(10000) * BigInt(365 * 24 * 60 * 60));
        const totalRepayment = loan.amount + interest;

        // Step 1: Approve repayment tokens
        setTransactionState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
          hash: null,
          step: "approving",
        });

        await approveToken(loan.tokenAddress, totalRepayment);

        // Wait a bit for the approval to be processed
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 2: Repay loan
        setTransactionState((prev) => ({
          ...prev,
          step: "repaying",
        }));

        const contract = await getWriteContract();
        const tx = await contract.repayLoan(loanId);
        await tx.wait();

        setTransactionState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          hash: tx.hash,
          step: "success",
        });

        // Refetch data
        await fetchBorrowerLoans();
        await fetchLenderLoans();

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to repay loan";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [
      address,
      getWriteContract,
      approveToken,
      fetchBorrowerLoans,
      fetchLenderLoans,
    ]
  );

  // Liquidate loan
  const liquidateLoan = useCallback(
    async (loanId: bigint) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        setTransactionState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
          hash: null,
          step: "liquidating",
        });

        const contract = await getWriteContract();
        const tx = await contract.liquidateLoan(loanId);
        await tx.wait();

        setTransactionState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          hash: tx.hash,
          step: "success",
        });

        // Refetch data
        await fetchLenderLoans();

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to liquidate loan";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [address, getWriteContract, fetchLenderLoans]
  );

  // Cancel loan offer
  const cancelLoanOffer = useCallback(
    async (loanId: bigint) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        setTransactionState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
          hash: null,
          step: "cancelling",
        });

        const contract = await getWriteContract();
        const tx = await contract.cancelLoanOffer(loanId);
        await tx.wait();

        setTransactionState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          hash: tx.hash,
          step: "success",
        });

        // Refetch data
        await fetchActiveLoanOffers();
        await fetchLenderLoans();

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to cancel loan offer";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [address, getWriteContract, fetchActiveLoanOffers, fetchLenderLoans]
  );

  // ============ UTILITY FUNCTIONS ============

  // Calculate interest for a loan
  const calculateInterest = useCallback((loan: Loan, currentTime?: bigint) => {
    if (loan.status !== LoanStatus.Active) return BigInt(0);

    const now = currentTime || BigInt(Math.floor(Date.now() / 1000));
    const timeElapsed = now - loan.startTime;
    return (
      (loan.amount * loan.interestRate * timeElapsed) /
      (BigInt(10000) * BigInt(365 * 24 * 60 * 60))
    );
  }, []);

  // Calculate total repayment amount
  const calculateTotalRepayment = useCallback(
    (loan: Loan, currentTime?: bigint) => {
      const interest = calculateInterest(loan, currentTime);
      return loan.amount + interest;
    },
    [calculateInterest]
  );

  // Check if loan is defaulted
  const isLoanDefaulted = useCallback((loan: Loan, currentTime?: bigint) => {
    if (loan.status !== LoanStatus.Active) return false;

    const now = currentTime || BigInt(Math.floor(Date.now() / 1000));
    return now > loan.startTime + loan.duration;
  }, []);

  // Format loan data for display
  const formatLoanData = useCallback(
    (loan: Loan) => {
      const interest = calculateInterest(loan);
      const totalRepayment = calculateTotalRepayment(loan);
      const isDefaulted = isLoanDefaulted(loan);

      // Get token information for proper decimal formatting
      const loanToken = Object.values(SUPPORTED_TOKENS).find(
        (token) =>
          token.address.toLowerCase() === loan.tokenAddress.toLowerCase()
      );
      const collateralToken = Object.values(SUPPORTED_TOKENS).find(
        (token) =>
          token.address.toLowerCase() === loan.collateralAddress.toLowerCase()
      );

      return {
        ...loan,
        formattedAmount: loanToken
          ? ethers.formatUnits(loan.amount, loanToken.decimals)
          : ethers.formatEther(loan.amount),
        formattedCollateralAmount: collateralToken
          ? ethers.formatUnits(loan.collateralAmount, collateralToken.decimals)
          : ethers.formatEther(loan.collateralAmount),
        formattedInterestRate: Number(loan.interestRate) / 100, // Convert from basis points to percentage
        formattedDuration: Number(loan.duration) / (24 * 60 * 60), // Convert seconds to days
        formattedInterest: loanToken
          ? ethers.formatUnits(interest, loanToken.decimals)
          : ethers.formatEther(interest),
        formattedTotalRepayment: loanToken
          ? ethers.formatUnits(totalRepayment, loanToken.decimals)
          : ethers.formatEther(totalRepayment),
        isDefaulted,
        statusText: ["Pending", "Active", "Repaid", "Defaulted"][loan.status],
      };
    },
    [calculateInterest, calculateTotalRepayment, isLoanDefaulted]
  );

  // ============ EFFECTS ============

  // Fetch data when connection state changes
  useEffect(() => {
    if (isConnected && address) {
      fetchActiveLoanOffers();
      fetchLenderLoans();
      fetchBorrowerLoans();
    }
  }, [
    isConnected,
    address,
    fetchActiveLoanOffers,
    fetchLenderLoans,
    fetchBorrowerLoans,
  ]);

  // Add collateral to loan
  const addCollateral = useCallback(
    async (loanId: bigint, additionalAmount: bigint) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        setTransactionState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
          hash: null,
          step: "adding_collateral",
        });

        const contract = await getWriteContract();
        const tx = await contract.addCollateral(loanId, additionalAmount);
        await tx.wait();

        setTransactionState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          hash: tx.hash,
          step: "success",
        });

        // Refetch data
        await fetchBorrowerLoans();
        await fetchLenderLoans();

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to add collateral";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [address, getWriteContract, fetchBorrowerLoans, fetchLenderLoans]
  );

  // Remove collateral from loan
  const removeCollateral = useCallback(
    async (loanId: bigint, removeAmount: bigint) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        setTransactionState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
          hash: null,
          step: "removing_collateral",
        });

        const contract = await getWriteContract();
        const tx = await contract.removeCollateral(loanId, removeAmount);
        await tx.wait();

        setTransactionState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          hash: tx.hash,
          step: "success",
        });

        // Refetch data
        await fetchBorrowerLoans();
        await fetchLenderLoans();

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to remove collateral";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [address, getWriteContract, fetchBorrowerLoans, fetchLenderLoans]
  );

  // Make partial repayment
  const makePartialRepayment = useCallback(
    async (loanId: bigint, repaymentAmount: bigint, loan: Loan) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        // Step 1: Approve repayment tokens
        setTransactionState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
          hash: null,
          step: "approving",
        });

        await approveToken(loan.tokenAddress, repaymentAmount);

        // Wait a bit for the approval to be processed
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 2: Make partial repayment
        setTransactionState((prev) => ({
          ...prev,
          step: "partial_repaying",
        }));

        const contract = await getWriteContract();
        const tx = await contract.makePartialRepayment(loanId, repaymentAmount);
        await tx.wait();

        setTransactionState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          hash: tx.hash,
          step: "success",
        });

        // Refetch data
        await fetchBorrowerLoans();
        await fetchLenderLoans();

        return tx.hash;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to make partial repayment";
        setTransactionState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          hash: null,
          step: "error",
        });
        throw error;
      }
    },
    [
      address,
      getWriteContract,
      approveToken,
      fetchBorrowerLoans,
      fetchLenderLoans,
    ]
  );

  // Get loan repayment info
  const getLoanRepaymentInfo = useCallback(
    async (loanId: bigint) => {
      try {
        const contract = await getReadContract();
        const result = await contract.getLoanRepaymentInfo(loanId);
        return {
          totalOwed: result[0],
          repaidAmount: result[1],
          remainingAmount: result[2],
          interestAccrued: result[3],
        };
      } catch (error) {
        console.error("Failed to get loan repayment info:", error);
        throw error;
      }
    },
    [getReadContract]
  );

  // Get loan health factor
  const getLoanHealthFactor = useCallback(
    async (loanId: bigint) => {
      try {
        const contract = await getReadContract();
        const result = await contract.getLoanHealthFactor(loanId);
        return {
          currentRatio: result[0],
          priceStale: result[1],
        };
      } catch (error) {
        console.error("Failed to get loan health factor:", error);
        throw error;
      }
    },
    [getReadContract]
  );

  return {
    // State
    transactionState,

    // Account info
    address,
    isConnected,

    // Read functions
    activeLoanOfferIds,
    isLoadingOffers,
    lenderLoans,
    isLoadingLenderLoans,
    borrowerLoans,
    isLoadingBorrowerLoans,
    getLoan,
    checkAllowance,
    checkBalance,

    // Write functions
    createLoanOffer,
    acceptLoanOffer,
    repayLoan,
    liquidateLoan,
    cancelLoanOffer,
    addCollateral,
    removeCollateral,
    makePartialRepayment,
    approveToken,

    // Utility functions
    calculateInterest,
    calculateTotalRepayment,
    isLoanDefaulted,
    getLoanRepaymentInfo,
    getLoanHealthFactor,
    formatLoanData,
    resetTransactionState,

    // Refetch functions
    refetchOffers: fetchActiveLoanOffers,
    refetchLenderLoans: fetchLenderLoans,
    refetchBorrowerLoans: fetchBorrowerLoans,
  };
};
