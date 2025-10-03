import { CoinGeckoPriceFetcher } from "./coingeckoPriceFetcher.js";
import { OracleUpdater } from "./oracleUpdater.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Crypto Price Oracle Service
 * Fetches prices from CoinGecko and pushes them to DomaRank Oracle
 */
export class CryptoPriceOracle {
  constructor(config = {}) {
    // Initialize price fetcher
    this.priceFetcher = new CoinGeckoPriceFetcher(config);

    // Initialize oracle updater
    this.oracleUpdater = new OracleUpdater({
      rpcUrl: config.rpcUrl || process.env.RPC_URL,
      privateKey: config.privateKey || process.env.ORACLE_UPDATER_PRIVATE_KEY,
      oracleAddress:
        config.oracleAddress || process.env.DOMA_RANK_ORACLE_ADDRESS,
    });

    // Token addresses (from your deployed contracts)
    this.tokenAddresses = {
      USDTEST: "0x8725f6FDF6E240C303B4e7A60AD13267Fa04d55C",
      MUSDC: "0x87c20443Ba0480677842851CB27a5b1D38C91639",
      MWBTC: "0x02BFF1B39378aCCB20b8870863f30D48b4Dc1DE4",
      MARB: "0x6E1f4b629Ea42Db26E2970aEcE38A61BB50a029f",
      MSOL: "0x457Ebd6E5ad62dF0fde31a1a144a9Ed1f1d2E38B",
    };

    // Update interval (30 minutes)
    this.updateIntervalMs = config.updateIntervalMs || 30 * 60 * 1000;

    this.isRunning = false;
    this.intervalId = null;

    console.log("🔮 Crypto Price Oracle initialized");
    console.log(
      `   Update interval: ${this.updateIntervalMs / 1000 / 60} minutes`
    );
    console.log(
      `   Tokens tracked: ${Object.keys(this.tokenAddresses).length}`
    );
  }

  /**
   * Fetch and push prices for all tokens
   * @returns {Promise<Object>}
   */
  async updatePrices() {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 PRICE UPDATE CYCLE STARTED");
    console.log("=".repeat(60));
    console.log(`   Time: ${new Date().toISOString()}\n`);

    const results = {
      timestamp: new Date().toISOString(),
      successful: [],
      failed: [],
      skipped: [],
    };

    try {
      // Step 1: Fetch prices from CoinGecko
      const symbols = Object.keys(this.tokenAddresses);
      const { results: priceData, errors: fetchErrors } =
        await this.priceFetcher.fetchPrices(symbols);

      // Log fetch errors
      if (fetchErrors.length > 0) {
        fetchErrors.forEach((err) => {
          results.failed.push({
            symbol: err.symbol,
            stage: "fetch",
            error: err.error,
          });
        });
      }

      // Step 2: Push prices to oracle
      console.log("\n💎 Pushing prices to DomaRank Oracle...\n");

      for (const price of priceData) {
        const tokenAddress = this.tokenAddresses[price.symbol];
        if (!tokenAddress) {
          console.warn(`⚠️ No address found for ${price.symbol}, skipping`);
          results.failed.push({
            symbol: price.symbol,
            stage: "push",
            error: "No token address",
          });
          continue;
        }

        try {
          const updateResult = await this.oracleUpdater.updateTokenPrice(
            tokenAddress,
            price.priceUSD18Decimals
          );

          if (updateResult.skipped) {
            console.log(
              `⊘ ${price.symbol}: Skipped (${updateResult.reason})\n`
            );
            results.skipped.push({
              symbol: price.symbol,
              address: tokenAddress,
              priceUSD: price.priceUSD,
              reason: updateResult.reason,
            });
          } else if (updateResult.success) {
            console.log(
              `✅ ${price.symbol}: Updated to $${price.priceUSD.toFixed(2)}\n`
            );
            results.successful.push({
              symbol: price.symbol,
              address: tokenAddress,
              priceUSD: price.priceUSD,
              txHash: updateResult.tx?.hash,
            });
          }
        } catch (error) {
          console.error(`❌ ${price.symbol}: Push failed -`, error.message);
          results.failed.push({
            symbol: price.symbol,
            address: tokenAddress,
            stage: "push",
            error: error.message,
          });
        }
      }

      // Step 3: Summary
      console.log("\n" + "=".repeat(60));
      console.log("📊 PRICE UPDATE CYCLE COMPLETED");
      console.log("=".repeat(60));
      console.log(`   ✅ Successful: ${results.successful.length}`);
      console.log(`   ⊘ Skipped: ${results.skipped.length}`);
      console.log(`   ❌ Failed: ${results.failed.length}`);
      console.log("=".repeat(60) + "\n");

      return results;
    } catch (error) {
      console.error("\n❌ Price update cycle failed:", error);
      throw error;
    }
  }

  /**
   * Start the automatic price update scheduler
   */
  start() {
    if (this.isRunning) {
      console.warn("⚠️ Oracle scheduler is already running");
      return;
    }

    console.log("\n🚀 Starting Crypto Price Oracle Scheduler...");
    console.log(
      `   Updates every ${this.updateIntervalMs / 1000 / 60} minutes`
    );

    // Run immediately on start
    this.updatePrices().catch((error) => {
      console.error("Initial update failed:", error);
    });

    // Schedule recurring updates
    this.intervalId = setInterval(() => {
      this.updatePrices().catch((error) => {
        console.error("Scheduled update failed:", error);
      });
    }, this.updateIntervalMs);

    this.isRunning = true;
    console.log("✅ Scheduler started successfully\n");
  }

  /**
   * Stop the automatic price update scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.warn("⚠️ Oracle scheduler is not running");
      return;
    }

    console.log("\n🛑 Stopping Crypto Price Oracle Scheduler...");

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log("✅ Scheduler stopped\n");
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      updateIntervalMinutes: this.updateIntervalMs / 1000 / 60,
      tokensTracked: Object.keys(this.tokenAddresses).length,
      tokens: Object.keys(this.tokenAddresses),
    };
  }

  /**
   * Manually trigger a price update (without waiting for interval)
   */
  async triggerUpdate() {
    console.log("⚡ Manual price update triggered");
    return await this.updatePrices();
  }

  /**
   * Add a new token to track
   * @param {string} symbol - Token symbol
   * @param {string} address - Token contract address
   * @param {string} coinGeckoId - CoinGecko coin ID
   */
  addToken(symbol, address, coinGeckoId) {
    this.tokenAddresses[symbol] = address;
    this.priceFetcher.addTokenMapping(symbol, coinGeckoId);
    console.log(`✓ Added token: ${symbol} (${address})`);
  }
}

// Run standalone if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🔮 Starting Crypto Price Oracle Service...\n");

  // Validate environment variables
  const requiredEnv = [
    "RPC_URL",
    "ORACLE_UPDATER_PRIVATE_KEY",
    "DOMA_RANK_ORACLE_ADDRESS",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error(
      "\nPlease set these in your .env file in the backend directory"
    );
    process.exit(1);
  }

  // Create and start oracle
  const oracle = new CryptoPriceOracle();

  // Start scheduler
  oracle.start();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Received SIGINT, shutting down gracefully...");
    oracle.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n\n🛑 Received SIGTERM, shutting down gracefully...");
    oracle.stop();
    process.exit(0);
  });

  // Keep process alive
  console.log("\n💡 Press Ctrl+C to stop the service\n");
}
