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
import {
  Loader2,
  Coins,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { getAllSupportedTokens, TokenInfo } from "@/config/tokens";
import { useMintTokens } from "@/hooks/useMintTokens";
import { useP2PLending } from "@/hooks/useP2PLending";
import { useAppKitProvider } from "@reown/appkit/react";
import { ConnectButton } from "./ConnectButton";
import Link from "next/link";

interface QuickMintTokensProps {
  className?: string;
}

// Quick mint amounts for each token (USDTEST not included - get from Mizu faucet)
const QUICK_MINT_AMOUNTS = {
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
  // Helper function to get Mizu testnet URL for domain tokens
  const getMizuDomainUrl = (token: TokenInfo): string | null => {
    if (!token.isDomainToken || !token.name) return null;

    // Extract domain name from token name (e.g., "software.ai" from token name)
    // Domain tokens typically have their domain as the name
    const domainName = token.name.toLowerCase();
    return `https://mizu-testnet.doma.xyz/domain/${domainName}`;
  };
  const { mintTokens, isMinting, mintingToken } = useMintTokens();
  const { isConnected } = useP2PLending();
  // Get only mock tokens
  const mockTokens = getAllSupportedTokens().filter((token) =>
    token.symbol.startsWith("M")
  );

  // Get domain tokens for trading
  const domainTokens = getAllSupportedTokens().filter(
    (token) => token.isDomainToken
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
          Mint stablecoins to lend or test borrowing with fractionalized domain
          tokens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isConnected ? (
          <ConnectButton />
        ) : (
          <>
            {/* USDTEST Faucet Link */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                    UD
                  </div>
                  <div>
                    <div className="text-sm font-semibold">USDTEST</div>
                    <div className="text-xs text-muted-foreground">
                      Official Doma testnet token
                    </div>
                  </div>
                </div>
                <Link
                  href="https://mizu-testnet.doma.xyz/faucet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Get from Faucet
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Mintable Mock Tokens */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mockTokens
                .filter((token) => token.symbol !== "USDTEST")
                .map((token) => {
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

            <div className="text-xs text-muted-foreground">
              <p>💡 Click to mint testnet tokens for lending on DomaLend</p>
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

        {/* Domain Tokens Trading Section */}
        {domainTokens.length > 0 && (
          <div className="pt-4 mt-4 border-t space-y-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                Trade Domain Tokens
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Buy fractional domain tokens on Mizu to use as collateral
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {domainTokens.slice(0, 4).map((token) => {
                const tradeUrl = getMizuDomainUrl(token);
                const imageUrl = token.domainMetadata?.image;

                return (
                  <Link
                    key={token.symbol}
                    href={tradeUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={token.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                          {token.symbol.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-medium">{token.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {token.symbol}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                );
              })}
            </div>

            {domainTokens.length > 4 && (
              <Link
                href="/offers"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                View all {domainTokens.length} domain tokens
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
