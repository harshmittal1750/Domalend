#!/usr/bin/env node

/**
 * Setup Mock Token Prices in DomaRankOracle
 *
 * This script sets up test prices for mock tokens (USDTEST, MUSDC, etc.)
 * in the DomaRankOracle contract so they can be used for testing.
 *
 * Since Chainlink price feeds don't exist on Doma testnet, we use
 * DomaRankOracle to provide prices for ALL tokens during testing.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

// Configuration
const RPC_URL = process.env.RPC_URL || "https://rpc-testnet.doma.xyz";
const ORACLE_ADDRESS = process.env.DOMA_RANK_ORACLE_ADDRESS;
const PRIVATE_KEY = process.env.ORACLE_UPDATER_PRIVATE_KEY;

// === DEPLOYMENT SUMMARY ===
//   USDTEST (6 decimals): 0x8725f6FDF6E240C303B4e7A60AD13267Fa04d55C - Official Doma Testnet Token
//   MockUSDC (6 decimals): 0x87c20443Ba0480677842851CB27a5b1D38C91639
//   MockWBTC (8 decimals): 0x02BFF1B39378aCCB20b8870863f30D48b4Dc1DE4
//   MockARB (18 decimals): 0x6E1f4b629Ea42Db26E2970aEcE38A61BB50a029f
//   MockSOL (18 decimals): 0x457Ebd6E5ad62dF0fde31a1a144a9Ed1f1d2E38B

// === ORACLE ADAPTER ADDRESSES (Already Configured) ===
//   USDT Price Feed: 0x67d2C2a87A17b7267a6DBb1A59575C0E9A1D1c3e
//   USDC Price Feed: 0x235266D5ca6f19F134421C49834C108b32C2124e
//   BTC Price Feed:  0x4803db1ca3A1DA49c3DB991e1c390321c20e1f21
//   ARB Price Feed:  0x74952812B6a9e4f826b2969C6D189c4425CBc19B
//   SOL Price Feed:  0xD5Ea6C434582F827303423dA21729bEa4F87D519
// // Mock token addresses (from deployed contracts)
const MOCK_TOKENS = {
  USDTEST: "0x8725f6FDF6E240C303B4e7A60AD13267Fa04d55C",
  MUSDC: "0x87c20443Ba0480677842851CB27a5b1D38C91639",
  MWBTC: "0x02BFF1B39378aCCB20b8870863f30D48b4Dc1DE4",
  MARB: "0x6E1f4b629Ea42Db26E2970aEcE38A61BB50a029f",
  MSOL: "0x457Ebd6E5ad62dF0fde31a1a144a9Ed1f1d2E38B",
};

// Test prices (in USD with 18 decimals)
const TEST_PRICES = {
  USDTEST: "1.00", // $1.00 USD
  MUSDC: "1.00", // $1.00 USD
  MWBTC: "65000.00", // $65,000 USD
  MARB: "2.50", // $2.50 USD
  MSOL: "150.00", // $150 USD
};

// DomaRankOracle ABI
const ORACLE_ABI = [
  {
    inputs: [
      { name: "_tokenAddress", type: "address" },
      { name: "_price", type: "uint256" },
    ],
    name: "updateTokenValue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_tokenAddress", type: "address" }],
    name: "getTokenValue",
    outputs: [{ name: "price", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

async function setupMockPrices() {
  console.log("🔧 Setting up mock token prices in DomaRankOracle...\n");

  // Validation
  if (
    !ORACLE_ADDRESS ||
    ORACLE_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    console.error("❌ Error: DOMA_RANK_ORACLE_ADDRESS not set in .env");
    process.exit(1);
  }

  if (!PRIVATE_KEY) {
    console.error("❌ Error: ORACLE_UPDATER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  try {
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, wallet);

    console.log(`📡 Connected to: ${RPC_URL}`);
    console.log(`🔑 Wallet: ${wallet.address}`);
    console.log(`🏦 Oracle: ${ORACLE_ADDRESS}\n`);

    // Set prices for each mock token
    for (const [symbol, address] of Object.entries(MOCK_TOKENS)) {
      const priceUSD = TEST_PRICES[symbol];
      const price18Decimals = ethers.parseUnits(priceUSD, 18);

      console.log(`💰 Setting ${symbol} price to $${priceUSD}...`);
      console.log(`   Address: ${address}`);

      try {
        const tx = await oracle.updateTokenValue(address, price18Decimals);
        console.log(`   📝 Transaction: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

        // Verify the price was set
        const storedPrice = await oracle.getTokenValue(address);
        const storedPriceUSD = ethers.formatUnits(storedPrice, 18);
        console.log(`   ✓ Verified: $${storedPriceUSD}\n`);
      } catch (error) {
        console.error(
          `   ❌ Error setting price for ${symbol}:`,
          error.message
        );
      }
    }

    console.log("✅ Mock token prices setup complete!\n");
    console.log("📊 Summary:");
    console.log("   MUSDT: $1.00");
    console.log("   MUSDC: $1.00");
    console.log("   MWBTC: $65,000");
    console.log("   MARB: $2.50");
    console.log("   MSOL: $150.00\n");

    console.log("💡 To use these in your frontend:");
    console.log(
      "   1. Update tokens.ts: hasDomaRankOracle: true for mock tokens"
    );
    console.log(
      "   2. Or keep as-is and only domain tokens will show oracle prices"
    );
    console.log(
      "   3. Frontend will now fetch these prices from DomaRankOracle\n"
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run if called directly
setupMockPrices().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { setupMockPrices, MOCK_TOKENS, TEST_PRICES };
