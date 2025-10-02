import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { getAllSupportedTokens } from "@/config/tokens";
import { toBaseUnit } from "@/lib/decimals";

// Mock ERC20 ABI - just the functions we need
const MOCK_TOKEN_ABI = [
  "function mintToSelf(uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];

interface MintResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useMintTokens() {
  const [isMinting, setIsMinting] = useState(false);
  const [mintingToken, setMintingToken] = useState<string | null>(null);

  const mintTokens = useCallback(
    async (
      tokenSymbol: string,
      amount: string,
      signer: ethers.Signer
    ): Promise<MintResult> => {
      try {
        setIsMinting(true);
        setMintingToken(tokenSymbol);

        // Find the token configuration
        const token = getAllSupportedTokens().find(
          (t) => t.symbol === tokenSymbol
        );
        if (!token) {
          throw new Error(`Token ${tokenSymbol} not found`);
        }

        // Only allow minting mock tokens (those starting with 'M')
        if (!token.symbol.startsWith("M")) {
          throw new Error(
            `Cannot mint ${tokenSymbol} - only mock tokens can be minted`
          );
        }

        // Convert amount to base units
        const amountInBaseUnits = toBaseUnit(amount, token.decimals);

        // Create contract instance
        const contract = new ethers.Contract(
          token.address,
          MOCK_TOKEN_ABI,
          signer
        );

        // Call mintToSelf function
        console.log(
          `Minting ${amount} ${tokenSymbol} (${amountInBaseUnits.toString()} base units)...`
        );
        const tx = await contract.mintToSelf(amountInBaseUnits);

        console.log(`Mint transaction sent: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`Mint transaction confirmed: ${receipt.transactionHash}`);

        return {
          success: true,
          txHash: receipt.transactionHash,
        };
      } catch (error: unknown) {
        console.error("Minting failed:", error);

        let errorMessage = "Failed to mint tokens";

        if (error && typeof error === "object") {
          const err = error as { code?: string; message?: unknown };

          if (err.code === "ACTION_REJECTED") {
            errorMessage = "Transaction was rejected by user";
          } else if (
            typeof err.message === "string" &&
            err.message.includes("insufficient funds")
          ) {
            errorMessage = "Insufficient funds for gas fees";
          } else if (
            typeof err.message === "string" &&
            err.message.includes("execution reverted")
          ) {
            errorMessage = "Transaction reverted - check contract state";
          } else if (typeof err.message === "string") {
            errorMessage = err.message;
          }
        }

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsMinting(false);
        setMintingToken(null);
      }
    },
    []
  );

  const mintMultipleTokens = useCallback(
    async (
      requests: Array<{ tokenSymbol: string; amount: string }>,
      signer: ethers.Signer
    ): Promise<{ results: MintResult[]; allSuccessful: boolean }> => {
      const results: MintResult[] = [];

      for (const request of requests) {
        const result = await mintTokens(
          request.tokenSymbol,
          request.amount,
          signer
        );
        results.push(result);

        // Add a small delay between transactions
        if (requests.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const allSuccessful = results.every((r) => r.success);

      return { results, allSuccessful };
    },
    [mintTokens]
  );

  return {
    mintTokens,
    mintMultipleTokens,
    isMinting,
    mintingToken,
  };
}
