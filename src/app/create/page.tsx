"use client";

import { generateBreadcrumbSchema, StructuredData } from "@/lib/seo";

const breadcrumbSchema = generateBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Create Loan Offer", url: "/create" },
]);

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useP2PLending, LoanOfferFormData } from "@/hooks/useP2PLending";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  AlertTriangle,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { TokenSelector, TokenSelectorRef } from "@/components/TokenSelector";
import { QuickMintTokens } from "@/components/QuickMintTokens";
import { TransactionModal } from "@/components/TransactionModal";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { ethers } from "ethers";
import {
  TokenInfo,
  getRecommendedParameters,
  formatBasisPoints,
  formatDuration,
  percentageToBasisPoints,
  // basisPointsToPercentage,
} from "@/config/tokens";
import { useCollateralCalculation } from "@/hooks/useTokenPrices";
import {
  // toBaseUnit,
  // fromBaseUnit,
  // formatTokenAmount,
  // formatUSDValue,
  DecimalValidation,
  // getTokenDisplayPrecision,
} from "@/lib/decimals";

export default function CreateLoanOfferPage() {
  const {
    createLoanOffer,
    transactionState,
    resetTransactionState,
    isConnected,
    address,
  } = useP2PLending();

  // Refs to access TokenSelector refresh functions
  const loanTokenSelectorRef = useRef<TokenSelectorRef>(null);
  const collateralTokenSelectorRef = useRef<TokenSelectorRef>(null);

  const [formData, setFormData] = useState<LoanOfferFormData>({
    tokenAddress: "",
    amount: "",
    interestRate: "",
    duration: "",
    collateralAddress: "",
    collateralAmount: "",
  });

  const [formErrors, setFormErrors] = useState<Partial<LoanOfferFormData>>({});
  const [selectedLoanToken, setSelectedLoanToken] = useState<
    TokenInfo | undefined
  >();
  const [selectedCollateralToken, setSelectedCollateralToken] = useState<
    TokenInfo | undefined
  >();

  // Get token balances for amount input UX
  const {
    formattedBalance: loanTokenBalance,
    isLoading: isLoadingLoanBalance,
    error: loanBalanceError,
    refreshBalance: refreshLoanBalance,
    balance: rawLoanBalance,
  } = useTokenBalance(
    selectedLoanToken?.address || null,
    address || null,
    selectedLoanToken?.decimals || 18,
    {
      refreshInterval: 30000,
      enableAutoRefresh: !!selectedLoanToken && !!address,
    }
  );

  // Debug log for loan token balance
  console.log(`[CreatePage] Loan token balance state:`, {
    selectedToken: selectedLoanToken?.symbol,
    tokenAddress: selectedLoanToken?.address,
    userAddress: address,
    balance: loanTokenBalance,
    rawBalance: rawLoanBalance,
    isLoading: isLoadingLoanBalance,
    error: loanBalanceError,
  });

  const {
    formattedBalance: collateralTokenBalance,
    isLoading: isLoadingCollateralBalance,
    error: collateralBalanceError,
    refreshBalance: refreshCollateralBalance,
    balance: rawCollateralBalance,
  } = useTokenBalance(
    selectedCollateralToken?.address || null,
    address || null,
    selectedCollateralToken?.decimals || 18,
    {
      refreshInterval: 30000,
      enableAutoRefresh: !!selectedCollateralToken && !!address,
    }
  );
  const [recommendedParams, setRecommendedParams] = useState<{
    minCollateralRatio: number;
    liquidationThreshold: number;
    maxPriceStaleness: number;
  } | null>(null);

  // Real-time collateral calculation based on oracle prices
  const {
    calculation: collateralCalc,
    isLoading: calcLoading,
    prices,
    refreshPrices,
  } = useCollateralCalculation(
    selectedLoanToken,
    selectedCollateralToken,
    formData.amount,
    formData.collateralAmount
  );

  const handleInputChange = (field: keyof LoanOfferFormData, value: string) => {
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Handle decimal validation for amount fields
    if (field === "amount" || field === "collateralAmount") {
      const token =
        field === "amount" ? selectedLoanToken : selectedCollateralToken;

      if (token && value !== "") {
        // Clean the input (remove invalid characters, limit decimals)
        const cleanedValue = DecimalValidation.cleanInput(
          value,
          token.decimals
        );

        // Allow partial inputs during typing (like "1." or "0.0")
        // Only validate format, not completeness
        if (!DecimalValidation.isValidDecimal(cleanedValue)) {
          // Don't block the input, but show a gentle warning
          // Only set error if the input is clearly invalid (contains invalid characters)
          if (cleanedValue !== value) {
            setFormErrors((prev) => ({
              ...prev,
              [field]: `Only numbers and decimal point allowed`,
            }));
          }
        }

        // Update with cleaned value (this allows typing)
        setFormData((prev) => ({ ...prev, [field]: cleanedValue }));
      } else {
        // Allow empty values during typing
        setFormData((prev) => ({ ...prev, [field]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Handle max button click for loan amount
  const handleMaxLoanAmount = () => {
    if (selectedLoanToken && rawLoanBalance) {
      const maxAmount = ethers.formatUnits(
        rawLoanBalance,
        selectedLoanToken.decimals
      );
      handleInputChange("amount", maxAmount);
    }
  };

  // Handle max button click for collateral amount
  const handleMaxCollateralAmount = () => {
    if (selectedCollateralToken && rawCollateralBalance) {
      const maxAmount = ethers.formatUnits(
        rawCollateralBalance,
        selectedCollateralToken.decimals
      );
      handleInputChange("collateralAmount", maxAmount);
    }
  };

  // Handle auto-fill minimum collateral with precision buffer
  const handleAutoFillMinCollateral = (
    minCollateralAmount: string,
    minCollateralAmountRaw?: bigint
  ) => {
    if (!selectedCollateralToken) return;

    let bufferedAmount: string;

    if (minCollateralAmountRaw) {
      // Use raw BigInt value for maximum precision
      // Add 0.1% buffer by multiplying by 1001/1000
      const bufferedRaw = (minCollateralAmountRaw * 1001n) / 1000n;

      // Convert back to human-readable format
      bufferedAmount = ethers.formatUnits(
        bufferedRaw,
        selectedCollateralToken.decimals
      );
    } else {
      // Fallback to string-based calculation if raw value not available
      const minAmount = parseFloat(minCollateralAmount);
      bufferedAmount = (minAmount * 1.001).toString();
    }

    // Clean up trailing zeros for better UX
    const cleanAmount = parseFloat(bufferedAmount).toString();

    console.log(
      `Auto-filling collateral: ${minCollateralAmount} → ${cleanAmount} (with 0.1% buffer)`
    );

    handleInputChange("collateralAmount", cleanAmount);
  };

  const handleLoanTokenSelect = (token: TokenInfo) => {
    console.log(`[CreatePage] Loan token selected:`, token);
    setSelectedLoanToken(token);
    setFormData((prev) => ({ ...prev, tokenAddress: token.address }));
    updateRecommendedParams(token, selectedCollateralToken);
    // The useTokenBalance hook will automatically fetch the balance when selectedLoanToken changes
  };

  const handleCollateralTokenSelect = (token: TokenInfo) => {
    setSelectedCollateralToken(token);
    setFormData((prev) => ({ ...prev, collateralAddress: token.address }));
    updateRecommendedParams(selectedLoanToken, token);
    // The useTokenBalance hook will automatically fetch the balance when selectedCollateralToken changes
  };

  const updateRecommendedParams = (
    loanToken?: TokenInfo,
    collateralToken?: TokenInfo
  ) => {
    if (loanToken && collateralToken) {
      const params = getRecommendedParameters(loanToken, collateralToken);
      setRecommendedParams(params);

      // Auto-fill recommended parameters if fields are empty
      if (!formData.interestRate) {
        setFormData((prev) => ({ ...prev, interestRate: "15" })); // 15% default (displayed as percentage)
      }
    } else {
      setRecommendedParams(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<LoanOfferFormData> = {};

    // Token address validation
    if (!formData.tokenAddress) {
      errors.tokenAddress = "Token address is required";
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.tokenAddress)) {
      errors.tokenAddress = "Invalid Ethereum address";
    } else if (
      formData.tokenAddress === "0x0000000000000000000000000000000000000000"
    ) {
      errors.tokenAddress = "Please select a valid token (not a placeholder)";
    }

    // Amount validation
    if (!formData.amount) {
      errors.amount = "Amount is required";
    } else if (!DecimalValidation.isCompleteDecimal(formData.amount)) {
      errors.amount = "Please enter a valid decimal number";
    } else if (parseFloat(formData.amount) <= 0) {
      errors.amount = "Amount must be a positive number";
    } else if (
      selectedLoanToken &&
      !DecimalValidation.hasValidPrecision(
        formData.amount,
        selectedLoanToken.decimals
      )
    ) {
      errors.amount = `Maximum ${selectedLoanToken.decimals} decimal places allowed for ${selectedLoanToken.symbol}`;
    } else if (
      selectedLoanToken &&
      rawLoanBalance &&
      parseFloat(formData.amount) >
        parseFloat(
          ethers.formatUnits(rawLoanBalance, selectedLoanToken.decimals)
        )
    ) {
      errors.amount = `Insufficient balance. You have ${loanTokenBalance} ${selectedLoanToken.symbol}`;
    }

    // Interest rate validation (input is in percentage, will be converted to basis points)
    if (!formData.interestRate) {
      errors.interestRate = "Interest rate is required";
    } else if (
      isNaN(parseFloat(formData.interestRate)) ||
      parseFloat(formData.interestRate) <= 0
    ) {
      errors.interestRate = "Interest rate must be a positive number";
    } else if (parseFloat(formData.interestRate) > 100) {
      errors.interestRate = "Interest rate cannot exceed 100%";
    }

    // Duration validation
    if (!formData.duration) {
      errors.duration = "Duration is required";
    } else if (
      isNaN(parseFloat(formData.duration)) ||
      parseFloat(formData.duration) <= 0
    ) {
      errors.duration = "Duration must be a positive number";
    } else if (parseFloat(formData.duration) > 365) {
      errors.duration = "Duration cannot exceed 365 days";
    }

    // Collateral address validation
    if (!formData.collateralAddress) {
      errors.collateralAddress = "Collateral address is required";
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.collateralAddress)) {
      errors.collateralAddress = "Invalid Ethereum address";
    } else if (
      formData.collateralAddress ===
      "0x0000000000000000000000000000000000000000"
    ) {
      errors.collateralAddress =
        "Please select a valid collateral token (not a placeholder)";
    }

    // Collateral amount validation
    if (!formData.collateralAmount) {
      errors.collateralAmount = "Collateral amount is required";
    } else if (
      !DecimalValidation.isCompleteDecimal(formData.collateralAmount)
    ) {
      errors.collateralAmount = "Please enter a valid decimal number";
    } else if (parseFloat(formData.collateralAmount) <= 0) {
      errors.collateralAmount = "Collateral amount must be a positive number";
    } else if (
      selectedCollateralToken &&
      !DecimalValidation.hasValidPrecision(
        formData.collateralAmount,
        selectedCollateralToken.decimals
      )
    ) {
      errors.collateralAmount = `Maximum ${selectedCollateralToken.decimals} decimal places allowed for ${selectedCollateralToken.symbol}`;
    } else if (
      selectedCollateralToken &&
      rawCollateralBalance &&
      parseFloat(formData.collateralAmount) >
        parseFloat(
          ethers.formatUnits(
            rawCollateralBalance,
            selectedCollateralToken.decimals
          )
        )
    ) {
      errors.collateralAmount = `Insufficient balance. You have ${collateralTokenBalance} ${selectedCollateralToken.symbol}`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("[CreatePage] Form submitted, transaction state:", {
      step: transactionState.step,
      isLoading: transactionState.isLoading,
      isSuccess: transactionState.isSuccess,
      isError: transactionState.isError,
    });

    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    // Reset transaction state if it's in success state (for creating another offer)
    if (transactionState.step === "success" || transactionState.isSuccess) {
      console.log(
        "[CreatePage] Resetting transaction state before new submission"
      );
      resetTransactionState();
    }

    if (!validateForm()) {
      return;
    }

    try {
      // Convert percentage to basis points for the contract
      const interestRatePercentage = parseFloat(formData.interestRate);
      const interestRateBasisPoints = percentageToBasisPoints(
        interestRatePercentage
      );

      // Additional validation before contract call
      if (interestRateBasisPoints > 10000) {
        alert(
          `Interest rate too high: ${interestRatePercentage}% (${interestRateBasisPoints} basis points). Maximum allowed is 100% (10000 basis points).`
        );
        return;
      }

      const contractFormData = {
        ...formData,
        interestRate: interestRateBasisPoints.toString(),
      };

      console.log("Creating loan with data:", {
        ...contractFormData,
        interestRatePercentage: `${interestRatePercentage}%`,
        interestRateBasisPoints: `${interestRateBasisPoints} BP`,
      });

      await createLoanOffer(contractFormData);

      // Refresh token balances after successful transaction
      loanTokenSelectorRef.current?.refreshBalance();
      collateralTokenSelectorRef.current?.refreshBalance();
      refreshLoanBalance();
      refreshCollateralBalance();
    } catch (error) {
      console.error("Failed to create loan offer:", error);

      // Parse common error messages for better user feedback
      let errorMessage = "Failed to create loan offer";

      if (error instanceof Error) {
        if (error.message.includes("Interest rate cannot exceed 100%")) {
          errorMessage =
            "Interest rate cannot exceed 100%. Please enter a lower rate.";
        } else if (error.message.includes("require(false)")) {
          errorMessage =
            "Transaction failed due to validation error. Please check your inputs and try again.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to create this loan offer.";
        } else if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else {
          errorMessage = `Transaction failed: ${error.message}`;
        }
      }
    }
  };

  const handleReset = () => {
    setFormData({
      tokenAddress: "",
      amount: "",
      interestRate: "",
      duration: "",
      collateralAddress: "",
      collateralAmount: "",
    });
    setFormErrors({});
    resetTransactionState();
  };

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <div className="">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Create Loan Offer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create a loan offer on DreamLend. Your tokens will be securely
            escrowed until the offer is accepted or cancelled.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Form - Left Side (2/3 width) */}
          <div className="xl:col-span-2">
            <Card className="luxury-shadow-lg">
              <CardHeader className="pb-6">
                <div>
                  <CardTitle className="text-2xl">
                    Loan Offer Configuration
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Configure your loan terms and collateral requirements
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Loan Token Details */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-primary font-bold text-sm">
                            1
                          </span>
                        </div>
                        Loan Token Details
                      </CardTitle>
                      <CardDescription>
                        Choose the token you want to lend and specify the amount
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <TokenSelector
                            ref={loanTokenSelectorRef}
                            selectedToken={selectedLoanToken}
                            onTokenSelect={handleLoanTokenSelect}
                            label="Loan Token"
                            placeholder="Select token to lend"
                            excludeToken={selectedCollateralToken}
                            userAddress={address}
                            showBalance={true}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="amount"
                              className="text-base font-medium"
                            >
                              Amount
                            </Label>
                            {selectedLoanToken && address && (
                              <div className="flex items-center gap-2 text-sm">
                                <Wallet className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  Balance:
                                </span>
                                {isLoadingLoanBalance ? (
                                  <div className="flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                                    <span className="text-xs text-muted-foreground">
                                      Fetching...
                                    </span>
                                  </div>
                                ) : loanBalanceError ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-destructive text-xs">
                                      Error
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={refreshLoanBalance}
                                      className="h-5 w-5 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-medium text-primary">
                                      {loanTokenBalance}{" "}
                                      {selectedLoanToken.symbol}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleMaxLoanAmount}
                                      className="h-6 px-2 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                                      disabled={
                                        !rawLoanBalance ||
                                        rawLoanBalance === "0"
                                      }
                                    >
                                      MAX
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <Input
                            id="amount"
                            type="text"
                            placeholder={
                              selectedLoanToken
                                ? `e.g., 1000 (max ${selectedLoanToken.decimals} decimals)`
                                : "1000"
                            }
                            value={formData.amount}
                            onChange={(e) =>
                              handleInputChange("amount", e.target.value)
                            }
                            className={`h-12 text-base ${
                              formErrors.amount
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                          />
                          {formErrors.amount && (
                            <p className="text-sm text-destructive flex items-center mt-2">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {formErrors.amount}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Loan Terms */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-primary font-bold text-sm">
                            2
                          </span>
                        </div>
                        Loan Terms
                      </CardTitle>
                      <CardDescription>
                        Set your interest rate and loan duration preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label
                            htmlFor="interestRate"
                            className="text-base font-medium"
                          >
                            Annual Interest Rate (%)
                          </Label>
                          <Input
                            id="interestRate"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="100"
                            placeholder="5.0"
                            value={formData.interestRate}
                            onChange={(e) =>
                              handleInputChange("interestRate", e.target.value)
                            }
                            className={`h-12 text-base ${
                              formErrors.interestRate
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                          />
                          {formErrors.interestRate && (
                            <p className="text-sm text-destructive flex items-center mt-2">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {formErrors.interestRate}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="duration"
                            className="text-base font-medium"
                          >
                            Duration (Days)
                          </Label>
                          <Input
                            id="duration"
                            type="number"
                            placeholder="30"
                            value={formData.duration}
                            onChange={(e) =>
                              handleInputChange("duration", e.target.value)
                            }
                            className={`h-12 text-base ${
                              formErrors.duration
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                          />
                          {formErrors.duration && (
                            <p className="text-sm text-destructive flex items-center mt-2">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {formErrors.duration}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Collateral Details */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-primary font-bold text-sm">
                            3
                          </span>
                        </div>
                        Collateral Requirements
                      </CardTitle>
                      <CardDescription>
                        Define what collateral borrowers must provide to secure
                        the loan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <TokenSelector
                            ref={collateralTokenSelectorRef}
                            selectedToken={selectedCollateralToken}
                            onTokenSelect={handleCollateralTokenSelect}
                            label="Collateral Token"
                            placeholder="Select collateral token"
                            excludeToken={selectedLoanToken}
                            userAddress={address}
                            showBalance={true}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="collateralAmount"
                              className="text-base font-medium"
                            >
                              Collateral Amount
                            </Label>
                            {selectedCollateralToken && address && (
                              <div className="flex items-center gap-2 text-sm">
                                <Wallet className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  Balance:
                                </span>
                                {isLoadingCollateralBalance ? (
                                  <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                                ) : collateralBalanceError ? (
                                  <span className="text-destructive">
                                    Error
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-medium text-primary">
                                      {collateralTokenBalance}{" "}
                                      {selectedCollateralToken.symbol}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleMaxCollateralAmount}
                                      className="h-6 px-2 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                                      disabled={
                                        !rawCollateralBalance ||
                                        rawCollateralBalance === "0"
                                      }
                                    >
                                      MAX
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <Input
                            id="collateralAmount"
                            type="text"
                            placeholder={
                              selectedCollateralToken
                                ? `e.g., 1500 (max ${selectedCollateralToken.decimals} decimals)`
                                : "1500"
                            }
                            value={formData.collateralAmount}
                            onChange={(e) =>
                              handleInputChange(
                                "collateralAmount",
                                e.target.value
                              )
                            }
                            className={`h-12 text-base ${
                              formErrors.collateralAmount
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                          />
                          {formErrors.collateralAmount && (
                            <p className="text-sm text-destructive flex items-center mt-2">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {formErrors.collateralAmount}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Real-time Collateral Calculator */}
                  {collateralCalc &&
                    selectedLoanToken &&
                    selectedCollateralToken &&
                    formData.amount && (
                      <Card className="glass luxury-shadow-lg border-primary/20 gradient-bg">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center">
                                <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center mr-2">
                                  <Info className="h-4 w-4 text-primary" />
                                </div>
                                Collateral Calculator
                              </CardTitle>
                              <CardDescription className="text-sm">
                                Live oracle pricing • Auto-refreshes every 30s
                              </CardDescription>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={refreshPrices}
                              disabled={calcLoading}
                              className="flex items-center gap-1 btn-premium h-8 px-2"
                            >
                              <RefreshCw
                                className={`h-3 w-3 ${
                                  calcLoading ? "animate-spin" : ""
                                }`}
                              />
                              <span className="text-xs">Refresh</span>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Current Market Prices - Compact */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border luxury-shadow">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-xs font-medium text-foreground">
                                  {selectedLoanToken.symbol}
                                </span>
                                <div
                                  className={`w-1.5 h-1.5 rounded-full status-dot ${
                                    prices.get(selectedLoanToken.address)
                                      ?.isStale
                                      ? "error"
                                      : "success"
                                  }`}
                                />
                              </div>
                              <div className="text-lg font-bold text-primary">
                                ${collateralCalc.priceImpact.loanTokenPriceUSD}
                              </div>
                            </div>

                            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border luxury-shadow">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-xs font-medium text-foreground">
                                  {selectedCollateralToken.symbol}
                                </span>
                                <div
                                  className={`w-1.5 h-1.5 rounded-full status-dot ${
                                    prices.get(selectedCollateralToken.address)
                                      ?.isStale
                                      ? "error"
                                      : "success"
                                  }`}
                                />
                              </div>
                              <div className="text-lg font-bold text-primary">
                                $
                                {
                                  collateralCalc.priceImpact
                                    .collateralTokenPriceUSD
                                }
                              </div>
                            </div>
                          </div>

                          {/* Exchange Rate - Compact */}
                          <div className="bg-secondary/50 border border-secondary rounded-lg p-3 luxury-shadow">
                            <div className="text-center">
                              <div className="text-xs font-medium text-secondary-foreground mb-1">
                                Exchange Rate
                              </div>
                              <div className="text-sm font-bold text-primary">
                                1 {selectedLoanToken.symbol} ={" "}
                                {collateralCalc.priceImpact.exchangeRate}{" "}
                                {selectedCollateralToken.symbol}
                              </div>
                            </div>
                          </div>

                          {/* Collateral Analysis - Compact */}
                          <div
                            className={`rounded-lg p-3 luxury-shadow transition-all duration-300 ${
                              formData.collateralAmount &&
                              parseFloat(formData.collateralAmount) > 0
                                ? collateralCalc.isHealthy
                                  ? "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30"
                                  : "bg-gradient-to-r from-accent/30 to-destructive/20 border border-destructive/30"
                                : "bg-gradient-to-r from-accent/20 to-muted/30 border border-muted-foreground/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {formData.collateralAmount &&
                                parseFloat(formData.collateralAmount) > 0 ? (
                                  collateralCalc.isHealthy ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-semibold text-primary">
                                        Well Secured
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                      <span className="text-sm font-semibold text-destructive-foreground">
                                        Needs More
                                      </span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-semibold text-foreground">
                                      Requirements
                                    </span>
                                  </>
                                )}
                              </div>
                              <span
                                className={`text-xs font-medium ${
                                  formData.collateralAmount &&
                                  parseFloat(formData.collateralAmount) > 0
                                    ? collateralCalc.isHealthy
                                      ? "text-primary"
                                      : "text-destructive"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {collateralCalc.minRatio}% Min
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  Minimum Required for {formData.amount}{" "}
                                  {selectedLoanToken.symbol}
                                </div>
                                <div
                                  className={`text-lg font-bold ${
                                    formData.collateralAmount &&
                                    parseFloat(formData.collateralAmount) > 0 &&
                                    collateralCalc.isHealthy
                                      ? "text-primary"
                                      : "text-destructive"
                                  }`}
                                >
                                  {collateralCalc.minCollateralAmount}{" "}
                                  {selectedCollateralToken.symbol}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ≈{" "}
                                  {
                                    collateralCalc.priceImpact
                                      .minCollateralValueUSD
                                  }
                                </div>
                              </div>

                              {formData.collateralAmount &&
                                parseFloat(formData.collateralAmount) > 0 && (
                                  <div className="pt-2 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">
                                        Your Amount:
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-1.5 h-1.5 rounded-full status-dot ${
                                            collateralCalc.isHealthy
                                              ? "success"
                                              : "error"
                                          }`}
                                        />
                                        <span
                                          className={`text-sm font-medium ${
                                            collateralCalc.isHealthy
                                              ? "text-primary"
                                              : "text-destructive"
                                          }`}
                                        >
                                          {collateralCalc.currentRatio}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                            </div>

                            {/* Auto-fill button - Compact */}
                            {(!formData.collateralAmount ||
                              parseFloat(formData.collateralAmount) === 0 ||
                              !collateralCalc.isHealthy) && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleAutoFillMinCollateral(
                                      collateralCalc.minCollateralAmount,
                                      collateralCalc.minCollateralAmountRaw
                                    );
                                  }}
                                  className={`w-full btn-premium border-border text-foreground transition-all duration-300 h-8 ${
                                    formData.collateralAmount &&
                                    parseFloat(formData.collateralAmount) > 0 &&
                                    !collateralCalc.isHealthy
                                      ? "bg-destructive/10 hover:bg-destructive/20 border-destructive/30"
                                      : "bg-card hover:bg-accent"
                                  }`}
                                >
                                  <span className="text-xs font-medium">
                                    {formData.collateralAmount &&
                                    parseFloat(formData.collateralAmount) > 0 &&
                                    !collateralCalc.isHealthy
                                      ? "Fix Collateral (+0.1% buffer)"
                                      : "Auto-fill Safe Amount (+0.1% buffer)"}
                                  </span>
                                </Button>
                              </div>
                            )}

                            {/* Success message when collateral is healthy */}
                            {formData.collateralAmount &&
                              parseFloat(formData.collateralAmount) > 0 &&
                              collateralCalc.isHealthy && (
                                <div className="mt-3 pt-3 border-t border-primary/20">
                                  <div className="flex items-center justify-center gap-2 text-primary">
                                    <CheckCircle className="h-3 w-3" />
                                    <span className="text-xs font-medium">
                                      Perfect! Well-secured and ready
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>

                          {calcLoading && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Calculating collateral requirements...
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                  {/* Risk Management Parameters - Compact */}
                  {recommendedParams &&
                    selectedLoanToken &&
                    selectedCollateralToken && (
                      <Card className="bg-secondary/30 border-secondary">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <Info className="h-4 w-4 text-primary mr-2" />
                            Risk Parameters
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {selectedLoanToken.symbol} →{" "}
                            {selectedCollateralToken.symbol}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="bg-card/80 backdrop-blur-sm rounded p-2 border border-border luxury-shadow">
                              <div className="font-medium text-foreground mb-1">
                                Min Ratio
                              </div>
                              <div className="text-sm font-bold text-primary">
                                {formatBasisPoints(
                                  recommendedParams.minCollateralRatio
                                )}
                              </div>
                            </div>

                            <div className="bg-card/80 backdrop-blur-sm rounded p-2 border border-border luxury-shadow">
                              <div className="font-medium text-foreground mb-1">
                                Liquidation
                              </div>
                              <div className="text-sm font-bold text-destructive">
                                {formatBasisPoints(
                                  recommendedParams.liquidationThreshold
                                )}
                              </div>
                            </div>

                            <div className="bg-card/80 backdrop-blur-sm rounded p-2 border border-border luxury-shadow">
                              <div className="font-medium text-foreground mb-1">
                                Price Age
                              </div>
                              <div className="text-sm font-bold text-accent-foreground">
                                {formatDuration(
                                  recommendedParams.maxPriceStaleness
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 p-2 bg-accent/20 border border-accent rounded text-xs luxury-shadow mt-3">
                            <AlertTriangle className="h-3 w-3 text-accent-foreground mt-0.5 flex-shrink-0" />
                            <div className="text-muted-foreground">
                              Volatility-based: {selectedLoanToken.symbol} (
                              {selectedLoanToken.volatilityTier}) →{" "}
                              {selectedCollateralToken.symbol} (
                              {selectedCollateralToken.volatilityTier})
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      type="submit"
                      disabled={transactionState.isLoading}
                      className="flex-1 h-12 text-base font-semibold btn-premium"
                      size="lg"
                    >
                      {transactionState.isLoading && (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      )}
                      {transactionState.step === "approving" &&
                        "Approving Tokens..."}
                      {transactionState.step === "creating" &&
                        "Creating Loan Offer..."}
                      {(transactionState.step === "idle" ||
                        transactionState.step === "success") &&
                        "Create Loan Offer"}
                      {!transactionState.isLoading && (
                        <ArrowRight className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={transactionState.isLoading}
                      className="h-12 text-base font-medium px-8"
                      size="lg"
                    >
                      Reset Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Quick Actions & Summary */}
          <div className="xl:col-span-1 space-y-6">
            {/* Quick Mint Tokens Section */}
            <QuickMintTokens />

            {/* Loan Summary - Always visible when form has data */}
            {formData.amount && formData.interestRate && formData.duration && (
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 sticky backdrop-blur-3xl top-20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center">
                    <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center mr-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    Loan Summary
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Review your loan offer details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Loan Amount:
                      </span>
                      <span className="font-semibold">
                        {formData.amount}{" "}
                        {selectedLoanToken?.symbol || "tokens"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Interest Rate:
                      </span>
                      <span className="font-semibold">
                        {formData.interestRate}% APR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-semibold">
                        {formData.duration} days
                      </span>
                    </div>
                    {formData.collateralAmount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Required Collateral:
                        </span>
                        <span className="font-semibold">
                          {formData.collateralAmount}{" "}
                          {selectedCollateralToken?.symbol || "tokens"}
                        </span>
                      </div>
                    )}
                    {formData.amount &&
                      formData.interestRate &&
                      formData.duration && (
                        <>
                          <Separator className="my-3" />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Total Interest:
                            </span>
                            <span className="font-semibold text-green-600">
                              {(
                                (parseFloat(formData.amount) *
                                  parseFloat(formData.interestRate) * // percentage rate
                                  parseFloat(formData.duration)) /
                                (365 * 100)
                              ) // convert percentage to decimal and annualize
                                .toFixed(6)}{" "}
                              {selectedLoanToken?.symbol || "tokens"}
                            </span>
                          </div>
                        </>
                      )}
                  </div>

                  {/* Collateral Health Status in Summary */}
                  {collateralCalc &&
                    selectedLoanToken &&
                    selectedCollateralToken &&
                    formData.amount &&
                    formData.collateralAmount &&
                    parseFloat(formData.collateralAmount) > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Collateral Health:
                            </span>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full status-dot ${
                                  collateralCalc.isHealthy ? "success" : "error"
                                }`}
                              />
                              <span
                                className={`text-sm font-medium ${
                                  collateralCalc.isHealthy
                                    ? "text-primary"
                                    : "text-destructive"
                                }`}
                              >
                                {collateralCalc.currentRatio}%
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {collateralCalc.isHealthy
                              ? "✓ Meets minimum requirements"
                              : "⚠ Needs more collateral"}
                          </div>
                        </div>
                      </>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Risk Parameters Summary */}
            {recommendedParams &&
              selectedLoanToken &&
              selectedCollateralToken && (
                <Card className="bg-secondary/30 border-secondary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <Info className="h-4 w-4 text-primary mr-2" />
                      Risk Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Min Ratio:
                        </span>
                        <span className="font-medium">
                          {formatBasisPoints(
                            recommendedParams.minCollateralRatio
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Liquidation:
                        </span>
                        <span className="font-medium text-destructive">
                          {formatBasisPoints(
                            recommendedParams.liquidationThreshold
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Price Age:
                        </span>
                        <span className="font-medium">
                          {formatDuration(recommendedParams.maxPriceStaleness)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>

        {/* Transaction Progress Modal */}
        <TransactionModal
          isOpen={transactionState.step !== "idle"}
          onClose={resetTransactionState}
          transactionState={transactionState}
          onReset={handleReset}
          onCreateAnother={() => {
            // Modal will call onClose() first, so we just need to reset the form
            handleReset();
          }}
          onViewLoans={() => {
            resetTransactionState();
            window.location.href = "/my-loans";
          }}
          title="Creating Loan Offer"
          successTitle="Loan Offer Created!"
          successDescription="Your loan offer has been created successfully and is now available for borrowers!"
        />
      </div>
    </>
  );
}
