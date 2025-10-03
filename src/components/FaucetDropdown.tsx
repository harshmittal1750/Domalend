"use client";

import { useCallback, useState } from "react";
import { Eip1193Provider, ethers } from "ethers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Coins,
  CheckCircle,
  Droplets,
  ExternalLink,
  Fuel,
  Globe,
} from "lucide-react";
import { getAllSupportedTokens } from "@/config/tokens";
import { useMintTokens } from "@/hooks/useMintTokens";
import { useP2PLending } from "@/hooks/useP2PLending";
import { useAppKitProvider } from "@reown/appkit/react";
import { toast } from "sonner";

// Quick mint amounts for each token (USDTEST not included - get from Mizu faucet)
const QUICK_MINT_AMOUNTS = {
  MUSDC: "1000",
  MWBTC: "1",
  MARB: "1000",
  MSOL: "100",
};

export function FaucetDropdown() {
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
    try {
      const signer = await getSigner();
      if (!signer) {
        toast.error("Please connect your wallet first");
        return;
      }

      const amount =
        QUICK_MINT_AMOUNTS[tokenSymbol as keyof typeof QUICK_MINT_AMOUNTS];
      if (!amount) {
        toast.error(`No quick mint amount defined for ${tokenSymbol}`);
        return;
      }

      const result = await mintTokens(tokenSymbol, amount, signer);

      if (result.success) {
        toast.success(`✅ Minted ${amount} ${tokenSymbol}!`);
        setMintedTokens((prev) => new Set([...prev, tokenSymbol]));
      } else {
        toast.error(result.error || "Failed to mint tokens");
      }
    } catch (error) {
      console.error("Minting error:", error);
      toast.error("Failed to mint tokens");
    }
  };

  const handleMintAll = async () => {
    try {
      const signer = await getSigner();
      if (!signer) {
        toast.error("Please connect your wallet first");
        return;
      }

      const requests = mockTokens
        .filter(
          (token) =>
            QUICK_MINT_AMOUNTS[token.symbol as keyof typeof QUICK_MINT_AMOUNTS]
        )
        .map((token) => ({
          tokenSymbol: token.symbol,
          amount:
            QUICK_MINT_AMOUNTS[token.symbol as keyof typeof QUICK_MINT_AMOUNTS],
        }));

      toast.info("Minting all tokens...");

      for (const request of requests) {
        const result = await mintTokens(
          request.tokenSymbol,
          request.amount,
          signer
        );
        if (result.success) {
          setMintedTokens((prev) => new Set([...prev, request.tokenSymbol]));
        }
        // Small delay between transactions
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      toast.success("All tokens minted successfully!");
    } catch (error) {
      console.error("Batch minting error:", error);
      toast.error("Failed to mint all tokens");
    }
  };

  const handleGetGasTokens = () => {
    // Open the Doma Bridge to get testnet ETH
    window.open("https://bridge-testnet.doma.xyz/", "_blank");
    toast.info("Opening Doma Bridge - Bridge ETH from Sepolia to Doma testnet");
  };

  const handleGetDomainTokens = () => {
    // Open Mizu DEX to buy fractionalized domain tokens
    window.open("https://mizu-testnet.doma.xyz/", "_blank");
    toast.info(
      "Opening Mizu DEX - Buy fractionalized domain tokens as collateral"
    );
  };

  if (!isConnected) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 rounded-xl hover:bg-accent hover:scale-105 transition-all duration-300 border-primary/20 hover:border-primary/40"
          disabled={isMinting}
        >
          {isMinting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Droplets className="h-4 w-4 mr-2" />
          )}
          <span className="hidden sm:inline">Faucet</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {/* Gas Token Section */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Fuel className="h-4 w-4" />
          Get Started with DomaLend
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={handleGetGasTokens}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <span className="text-sm">Bridge ETH (Doma Testnet)</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleGetDomainTokens}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3" />
            <span className="text-sm">Buy Domain Tokens (Mizu DEX)</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* USDTEST Faucet */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Droplets className="h-4 w-4" />
          Official Doma Testnet Token
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            window.open("https://mizu-testnet.doma.xyz/faucet", "_blank");
            toast.info(
              "Opening Mizu Faucet - Get 10,000 USDTEST every 6 hours"
            );
          }}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <span className="text-sm">Get USDTEST from Faucet</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Mint Test Tokens (For Lending)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {mockTokens.map((token) => {
          const amount =
            QUICK_MINT_AMOUNTS[token.symbol as keyof typeof QUICK_MINT_AMOUNTS];
          const isCurrentlyMinting = isMinting && mintingToken === token.symbol;
          const wasMinted = mintedTokens.has(token.symbol);

          if (!amount) return null;

          return (
            <DropdownMenuItem
              key={token.symbol}
              onClick={() => handleQuickMint(token.symbol)}
              disabled={isMinting}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {isCurrentlyMinting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : wasMinted ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Coins className="h-3 w-3" />
                )}
                <span className="text-sm">{token.symbol}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {amount}
              </Badge>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleMintAll}
          disabled={isMinting}
          className="flex items-center gap-2 cursor-pointer font-medium"
        >
          <Coins className="h-4 w-4" />
          Mint All Tokens
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
