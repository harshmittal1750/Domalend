"use client";

import { useCallback, useState } from "react";
import { Eip1193Provider, ethers } from "ethers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, CheckCircle, AlertCircle } from "lucide-react";
import { getAllSupportedTokens } from "@/config/tokens";
import { useMintTokens } from "@/hooks/useMintTokens";
import { useP2PLending } from "@/hooks/useP2PLending";
import { useAppKitProvider } from "@reown/appkit/react";
import { ConnectButton } from "./ConnectButton";

interface QuickMintTokensProps {
  className?: string;
}

// Quick mint amounts for each token
const QUICK_MINT_AMOUNTS = {
  MUSDT: "1000",
  MUSDC: "1000",
  MWBTC: "1",
  MARB: "1000",
  MSOL: "100",
};

export function QuickMintTokens({ className }: QuickMintTokensProps) {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [mintedTokens, setMintedTokens] = useState<Set<string>>(new Set());
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");
  const getSigner = useCallback(async () => {
    if (!walletProvider) throw new Error("Wallet not connected");
    const ethersProvider = new ethers.BrowserProvider(walletProvider);
    return await ethersProvider.getSigner();
  }, [walletProvider]);

  const { mintTokens, isMinting, mintingToken } = useMintTokens();
  const { isConnected } = useP2PLending();
  // Get only mock tokens
  const mockTokens = getAllSupportedTokens().filter((token) =>
    token.symbol.startsWith("M")
  );

  const handleQuickMint = async (tokenSymbol: string) => {
    const signer = await getSigner();
    if (!signer) {
      setError("Please connect your wallet first");
      return;
    }

    const amount =
      QUICK_MINT_AMOUNTS[tokenSymbol as keyof typeof QUICK_MINT_AMOUNTS];
    if (!amount) {
      setError(`No quick mint amount defined for ${tokenSymbol}`);
      return;
    }

    setError("");
    setSuccess("");

    const result = await mintTokens(tokenSymbol, amount, signer);

    if (result.success) {
      setSuccess(`✅ Minted ${amount} ${tokenSymbol}!`);
      setMintedTokens((prev) => new Set([...prev, tokenSymbol]));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(result.error || "Failed to mint tokens");
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-4 w-4" />
          Quick Mint Test Tokens
        </CardTitle>
        <CardDescription className="text-sm">
          Need test tokens? Mint them instantly for testing loans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isConnected ? (
          <ConnectButton />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mockTokens.map((token) => {
                const amount =
                  QUICK_MINT_AMOUNTS[
                    token.symbol as keyof typeof QUICK_MINT_AMOUNTS
                  ];
                const isCurrentlyMinting =
                  isMinting && mintingToken === token.symbol;
                const wasMinted = mintedTokens.has(token.symbol);

                return (
                  <Button
                    key={token.symbol}
                    variant={wasMinted ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickMint(token.symbol)}
                    disabled={isMinting || !amount}
                    className="flex items-center gap-1 text-xs"
                  >
                    {isCurrentlyMinting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : wasMinted ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : null}
                    {amount} {token.symbol}
                  </Button>
                );
              })}
            </div>

            <div className="text-xs text-gray-600">
              <p>💡 Click any token to mint testing amounts instantly</p>
            </div>
          </>
        )}

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="py-2">
            <CheckCircle className="h-3 w-3" />
            <AlertDescription className="text-xs text-green-600">
              {success}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
