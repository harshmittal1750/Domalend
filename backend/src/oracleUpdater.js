/**
 * @fileoverview Oracle Updater Service
 * @description Handles on-chain price updates to the DomaRankOracle contract
 */

import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

/**
 * DomaRankOracle ABI (minimal - only what we need)
 */
const DOMA_RANK_ORACLE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
      { internalType: "uint256", name: "_price", type: "uint256" },
    ],
    name: "updateTokenValue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "getTokenValue",
    outputs: [{ internalType: "uint256", name: "price", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "tokenPrices",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * OracleUpdater class to manage blockchain interactions
 */
export class OracleUpdater {
  constructor(config = {}) {
    this.rpcUrl =
      config.rpcUrl || process.env.RPC_URL || "https://rpc-testnet.doma.xyz";
    this.oracleAddress =
      config.oracleAddress ||
      process.env.DOMA_RANK_ORACLE_ADDRESS ||
      ethers.ZeroAddress;
    this.privateKey =
      config.privateKey || process.env.ORACLE_UPDATER_PRIVATE_KEY || "";

    // Validate configuration
    if (!this.privateKey) {
      throw new Error("Oracle updater private key not configured");
    }
    if (this.oracleAddress === ethers.ZeroAddress) {
      throw new Error("DomaRank oracle address not configured");
    }

    // Initialize provider and wallet
    // Define Doma network to disable ENS (Doma doesn't support ENS)
    const domaNetwork = {
      chainId: 97476,
      name: "doma-testnet",
      ensAddress: null, // Explicitly disable ENS
    };

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl, domaNetwork);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    this.contract = new ethers.Contract(
      this.oracleAddress,
      DOMA_RANK_ORACLE_ABI,
      this.wallet
    );

    console.log("Oracle Updater initialized:");
    console.log(`  Oracle Address: ${this.oracleAddress}`);
    console.log(`  Updater Address: ${this.wallet.address}`);
    console.log(`  RPC URL: ${this.rpcUrl}\n`);
  }

  /**
   * Checks if the wallet is the owner of the oracle contract
   * @returns {Promise<boolean>}
   */
  async isOwner() {
    try {
      const owner = await this.contract.owner();
      return owner.toLowerCase() === this.wallet.address.toLowerCase();
    } catch (error) {
      console.error("Error checking owner:", error.message);
      return false;
    }
  }

  /**
   * Gets the current price for a token from the oracle
   * @param {string} tokenAddress - Token address
   * @returns {Promise<string>} Current price (18 decimals)
   */
  async getCurrentPrice(tokenAddress) {
    try {
      // Validate address format
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!tokenAddress || !addressRegex.test(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      // Manually encode the function call to bypass ENS resolution
      const iface = new ethers.Interface(DOMA_RANK_ORACLE_ABI);
      const data = iface.encodeFunctionData("getTokenValue", [tokenAddress]);

      const result = await this.provider.call({
        to: this.oracleAddress,
        data: data,
      });

      // Decode the result
      const decoded = iface.decodeFunctionResult("getTokenValue", result);
      return decoded[0].toString();
    } catch (error) {
      if (error.message.includes("Token price not set")) {
        return "0";
      }
      throw error;
    }
  }

  /**
   * Updates the price for a single token on-chain
   * @param {string} tokenAddress - Token address
   * @param {string} priceUSD18Decimals - Price in USD with 18 decimals
   * @returns {Promise<Object>} Transaction result
   */
  async updateTokenPrice(tokenAddress, priceUSD18Decimals) {
    try {
      // Validate inputs
      if (!tokenAddress || typeof tokenAddress !== "string") {
        throw new Error(
          "Invalid token address: address is missing or not a string"
        );
      }

      if (!priceUSD18Decimals) {
        throw new Error("Invalid price: price is missing");
      }

      // Validate address format (0x + 40 hex chars)
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!addressRegex.test(tokenAddress)) {
        throw new Error(`Invalid Ethereum address format: ${tokenAddress}`);
      }

      // Use lowercase to normalize (avoid ethers.getAddress which might trigger ENS)
      const validatedAddress = tokenAddress.toLowerCase();

      console.log(`Updating price for ${validatedAddress}...`);
      console.log(`  New price: ${priceUSD18Decimals} Wei`);

      // Get current price to check if update is needed
      const currentPrice = await this.getCurrentPrice(validatedAddress);
      console.log(`  Current price: ${currentPrice} Wei`);

      // Calculate price change percentage
      const priceChange = this._calculatePriceChange(
        currentPrice,
        priceUSD18Decimals
      );

      // Skip update if price hasn't changed significantly (< 1% change)
      if (currentPrice !== "0" && Math.abs(priceChange) < 1) {
        console.log(
          `  ⊘ Skipping update (price change: ${priceChange.toFixed(2)}%)\n`
        );
        return {
          success: true,
          skipped: true,
          reason: "Insignificant price change",
          priceChange,
        };
      }

      // Send transaction
      // Manually encode the function call to bypass ENS resolution
      const iface = new ethers.Interface(DOMA_RANK_ORACLE_ABI);
      const data = iface.encodeFunctionData("updateTokenValue", [
        validatedAddress,
        priceUSD18Decimals,
      ]);

      const tx = await this.wallet.sendTransaction({
        to: this.oracleAddress,
        data: data,
      });

      console.log(`  Transaction sent: ${tx.hash}`);
      console.log(`  Waiting for confirmation...`);

      const receipt = await tx.wait();

      console.log(`  ✓ Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
      console.log(
        `  Price change: ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%\n`
      );

      return {
        success: true,
        skipped: false,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        priceChange,
      };
    } catch (error) {
      console.error(`  ✗ Error updating price: ${error.message}\n`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Updates prices for multiple tokens in batch
   * @param {Array<{tokenAddress: string, price: string}>} updates - Array of token updates
   * @param {number} delayMs - Delay between updates in milliseconds (default: 1000)
   * @returns {Promise<Object>} Summary of updates
   */
  async updateMultipleTokenPrices(updates, delayMs = 1000) {
    console.log(`Starting batch update for ${updates.length} tokens...\n`);

    const results = {
      total: updates.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      transactions: [],
    };

    for (let i = 0; i < updates.length; i++) {
      const { tokenAddress, price } = updates[i];

      console.log(
        `[${i + 1}/${updates.length}] Processing ${tokenAddress.slice(0, 10)}...`
      );

      try {
        const result = await this.updateTokenPrice(tokenAddress, price);
        results.transactions.push({ tokenAddress, ...result });

        if (result.success) {
          if (result.skipped) {
            results.skipped++;
          } else {
            results.successful++;
          }
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Error processing ${tokenAddress}:`, error.message);
        results.failed++;
        results.transactions.push({
          tokenAddress,
          success: false,
          error: error.message,
        });
      }

      // Delay between transactions to avoid rate limiting
      if (i < updates.length - 1 && delayMs > 0) {
        await this._sleep(delayMs);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("BATCH UPDATE SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total: ${results.total}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Failed: ${results.failed}`);
    console.log("=".repeat(60) + "\n");

    return results;
  }

  /**
   * Gets the wallet's current balance
   * @returns {Promise<string>} Balance in ETH
   */
  async getBalance() {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Estimates gas cost for a price update
   * @param {string} tokenAddress - Token address
   * @param {string} price - Price in 18 decimals
   * @returns {Promise<Object>} Gas estimate
   */
  async estimateGasCost(tokenAddress, price) {
    try {
      // Validate address format
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!tokenAddress || !addressRegex.test(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      // Manually encode the function call to bypass ENS resolution
      const iface = new ethers.Interface(DOMA_RANK_ORACLE_ABI);
      const data = iface.encodeFunctionData("updateTokenValue", [
        tokenAddress,
        price,
      ]);

      const gasEstimate = await this.provider.estimateGas({
        from: this.wallet.address,
        to: this.oracleAddress,
        data: data,
      });

      const feeData = await this.provider.getFeeData();
      const gasCost = gasEstimate * (feeData.gasPrice || 0n);

      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0n, "gwei"),
        estimatedCost: ethers.formatEther(gasCost),
      };
    } catch (error) {
      console.error("Error estimating gas:", error.message);
      return null;
    }
  }

  /**
   * Helper: Calculate percentage change between two prices
   * @private
   */
  _calculatePriceChange(oldPrice, newPrice) {
    const old = parseFloat(oldPrice);
    const current = parseFloat(newPrice);

    if (old === 0) return current > 0 ? 100 : 0;

    return ((current - old) / old) * 100;
  }

  /**
   * Helper: Sleep for specified milliseconds
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Test function
 */
async function main() {
  console.log("=== Testing Oracle Updater ===\n");

  try {
    const updater = new OracleUpdater();

    // Check if wallet is owner
    const isOwner = await updater.isOwner();
    console.log(`Is owner: ${isOwner}\n`);

    if (!isOwner) {
      console.warn(
        "⚠️  Warning: Wallet is not the owner of the oracle contract"
      );
      console.log(
        "Updates will fail unless this address has owner privileges\n"
      );
    }

    // Check balance
    const balance = await updater.getBalance();
    console.log(`Wallet balance: ${balance} ETH\n`);

    // Test price update (using a mock address)
    const testTokenAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
    const testPrice = "1000000000000000000"; // 1 ETH = $1

    console.log("Testing single price update...\n");

    // Estimate gas first
    const gasEstimate = await updater.estimateGasCost(
      testTokenAddress,
      testPrice
    );
    if (gasEstimate) {
      console.log("Gas estimate:");
      console.log(`  Limit: ${gasEstimate.gasLimit}`);
      console.log(`  Price: ${gasEstimate.gasPrice} gwei`);
      console.log(`  Cost: ${gasEstimate.estimatedCost} ETH\n`);
    }

    // Uncomment to test actual update (requires funds and proper configuration)
    // const result = await updater.updateTokenPrice(testTokenAddress, testPrice);
    // console.log('Update result:', result);

    console.log("✓ Oracle updater test completed\n");
  } catch (error) {
    console.error("Error in test:", error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
