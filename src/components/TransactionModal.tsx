"use client";

import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface TransactionState {
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
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  hash: string | null;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionState: TransactionState;
  onReset: () => void;
  onCreateAnother?: () => void;
  onViewLoans?: () => void;
  title?: string;
  successTitle?: string;
  successDescription?: string;
  steps?: {
    approval: {
      title: string;
      description: string;
      loadingText: string;
      successText: string;
      errorText: string;
    };
    transaction: {
      title: string;
      description: string;
      loadingText: string;
      successText: string;
      errorText: string;
    };
  };
}

const defaultSteps = {
  approval: {
    title: "Approve Token Spending",
    description: "Allow the contract to spend your tokens",
    loadingText: "Waiting for wallet confirmation...",
    successText: "Token spending approved successfully",
    errorText: "Failed to approve token spending",
  },
  transaction: {
    title: "Create Loan Offer",
    description: "Submit the loan offer to the blockchain",
    loadingText: "Creating your loan offer on-chain...",
    successText: "Loan offer created successfully!",
    errorText: "Failed to create loan offer",
  },
};

export function TransactionModal({
  isOpen,
  onClose,
  transactionState,
  onReset,
  onCreateAnother,
  onViewLoans,
  title = "Transaction in Progress",
  successTitle = "Transaction Complete!",
  successDescription = "Your transaction has been completed successfully!",
  steps = defaultSteps,
}: TransactionModalProps) {
  // Track if we've already shown a toast for this error to prevent duplicates
  const [shownErrorHash, setShownErrorHash] = React.useState<string | null>(
    null
  );

  // Show error toast when transaction fails
  useEffect(() => {
    if (transactionState.isError && transactionState.error) {
      // Create a simple hash of the error to prevent showing the same error multiple times
      const errorHash = `${transactionState.step}-${transactionState.error}`;

      if (errorHash !== shownErrorHash) {
        setShownErrorHash(errorHash);

        // Extract just the error title/type, not the full message
        let errorTitle = "Transaction Failed";
        if (transactionState.error.includes("User rejected")) {
          errorTitle = "Transaction Cancelled";
        } else if (transactionState.error.includes("insufficient funds")) {
          errorTitle = "Insufficient Funds";
        } else if (
          transactionState.error.includes("Interest rate cannot exceed")
        ) {
          errorTitle = "Invalid Interest Rate";
        } else if (transactionState.error.includes("require(false)")) {
          errorTitle = "Validation Error";
        }

        toast.error(errorTitle, {
          description: "Check your wallet or try again",
          duration: 6000, // Show for 6 seconds
          action: {
            label: "Try Again",
            onClick: () => {
              onClose();
              // Don't call onReset() - just close modal to retry
            },
          },
        });
      }
    }
  }, [
    transactionState.isError,
    transactionState.error,
    transactionState.step,
    shownErrorHash,
    onClose,
  ]);

  // Reset error hash when transaction state changes to non-error
  useEffect(() => {
    if (!transactionState.isError) {
      setShownErrorHash(null);
    }
  }, [transactionState.isError]);
  const getStepStatus = (step: "approving" | "creating") => {
    if (transactionState.step === step && transactionState.isLoading) {
      return "loading";
    }
    if (transactionState.step === step && transactionState.isError) {
      return "error";
    }
    // Approval is successful when we move to creating step or beyond
    if (
      step === "approving" &&
      (transactionState.step === "creating" ||
        transactionState.step === "success")
    ) {
      return "success";
    }
    // Creating is only successful when we reach the final success step
    if (step === "creating" && transactionState.step === "success") {
      return "success";
    }
    return "idle";
  };

  const getModalTitle = () => {
    if (transactionState.isSuccess && transactionState.step === "success") {
      return successTitle;
    }
    if (transactionState.isError) {
      return "Transaction Failed";
    }
    if (transactionState.step === "approving") {
      return "Approving Token Spending";
    }
    if (transactionState.step === "creating") {
      return "Creating Loan Offer";
    }
    return title;
  };

  const getModalDescription = () => {
    if (transactionState.isSuccess && transactionState.step === "success") {
      return successDescription;
    }
    if (transactionState.isError) {
      return "There was an issue with your transaction. Please try again.";
    }
    if (transactionState.step === "approving") {
      return "Please confirm the token approval in your wallet.";
    }
    if (transactionState.step === "creating") {
      return "Please confirm the transaction in your wallet and wait for it to complete.";
    }
    return "Please confirm the transactions in your wallet and wait for them to complete.";
  };

  const StepIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "loading":
        return (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        );
      case "success":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
        );
      case "error":
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
          </div>
        );
    }
  };

  const getStepText = (step: "approving" | "creating", status: string) => {
    const stepConfig = steps[step === "approving" ? "approval" : "transaction"];

    switch (status) {
      case "loading":
        return stepConfig.loadingText;
      case "success":
        return stepConfig.successText;
      case "error":
        return stepConfig.errorText;
      default:
        return stepConfig.description;
    }
  };

  const getStepTextColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-emerald-600 dark:text-emerald-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "loading":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only allow closing if transaction is complete (success or error)
        if (!open && (transactionState.isSuccess || transactionState.isError)) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={transactionState.isSuccess || transactionState.isError}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl flex items-center justify-center gap-3">
            {transactionState.isSuccess ? (
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            ) : transactionState.isError ? (
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Progress Steps */}
          <div className="space-y-4">
            {/* Step 1: Approval */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <StepIcon status={getStepStatus("approving")} />
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold ${getStepTextColor(getStepStatus("approving"))}`}
                >
                  {steps.approval.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getStepText("approving", getStepStatus("approving"))}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            <div className="flex justify-center">
              <div
                className={`w-0.5 h-8 transition-colors duration-300 ${
                  getStepStatus("approving") === "success"
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/30"
                }`}
              />
            </div>

            {/* Step 2: Transaction */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <StepIcon status={getStepStatus("creating")} />
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold ${getStepTextColor(getStepStatus("creating"))}`}
                >
                  {steps.transaction.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getStepText("creating", getStepStatus("creating"))}
                </p>
              </div>
            </div>
          </div>

          {/* Success Message - Only show when both transactions are complete */}
          {transactionState.isSuccess &&
            transactionState.step === "success" && (
              <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                  <div className="space-y-1">
                    <p className="font-medium">{successDescription}</p>
                    {transactionState.hash && (
                      <p className="text-xs font-mono">
                        Transaction: {transactionState.hash.slice(0, 10)}...
                        {transactionState.hash.slice(-8)}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {transactionState.isSuccess &&
              transactionState.step === "success" && (
                <>
                  {onCreateAnother && (
                    <Button
                      onClick={() => {
                        onClose();
                        onCreateAnother();
                      }}
                      className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      Create Another Offer
                    </Button>
                  )}
                  {onViewLoans && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onViewLoans();
                      }}
                      className="flex-1 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                    >
                      <span className="flex items-center gap-2">
                        View My Loans
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                  )}
                </>
              )}
            {transactionState.isError && (
              <Button
                onClick={() => {
                  onClose();
                  // Don't call onReset() - just close modal to retry with same form data
                }}
                variant="outline"
                className="w-full border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
              >
                Try Again
              </Button>
            )}
            {transactionState.isLoading && (
              <div className="w-full text-center text-sm text-muted-foreground">
                Please check your wallet for pending transactions...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
