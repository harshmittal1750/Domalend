/**
 * @fileoverview Oracle Update Orchestrator
 * @description Main service that connects the data collector, pricing engine, and oracle updater
 * Runs the complete pipeline on a scheduled interval
 */

import { getAllFractionalTokenAddresses } from "./subgraphQueries.js";
import { fetchDomainDataByToken } from "./dataCollector.js";
import { calculateDomaValue } from "./pricingEngine.js";
import { OracleUpdater } from "./oracleUpdater.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configuration for the orchestrator
 */
const DEFAULT_CONFIG = {
  updateInterval: parseInt(process.env.UPDATE_INTERVAL_MS) || 5 * 60 * 1000, // 5 minutes
  maxTokensPerRun: parseInt(process.env.MAX_TOKENS_PER_RUN) || 50, // Process 50 tokens per run
  delayBetweenUpdates: 2000, // 2 seconds between blockchain transactions
  minPriceChangePercent: 1, // Only update if price changed by 1%
  enableScheduler: true, // Enable automatic scheduling
};

/**
 * Main Orchestrator class
 */
export class OracleOrchestrator {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.oracleUpdater = null;
    this.isRunning = false;
    this.schedulerInterval = null;
    this.stats = {
      totalRuns: 0,
      totalTokensProcessed: 0,
      totalUpdatesSuccessful: 0,
      totalUpdatesFailed: 0,
      lastRunTime: null,
      lastError: null,
    };

    console.log("Oracle Orchestrator initialized with config:");
    console.log(
      `  Update Interval: ${this.config.updateInterval / 1000} seconds`
    );
    console.log(`  Max Tokens Per Run: ${this.config.maxTokensPerRun}`);
    console.log(
      `  Delay Between Updates: ${this.config.delayBetweenUpdates}ms\n`
    );
  }

  /**
   * Initializes the oracle updater connection
   */
  async initialize() {
    try {
      console.log("Initializing oracle connection...\n");
      this.oracleUpdater = new OracleUpdater();

      // Verify connection and permissions
      const isOwner = await this.oracleUpdater.isOwner();
      if (!isOwner) {
        console.warn(
          "⚠️  WARNING: Wallet is not the owner of the oracle contract!"
        );
        console.warn("Updates may fail. Please check configuration.\n");
      }

      const balance = await this.oracleUpdater.getBalance();
      console.log(`Wallet balance: ${balance} ETH`);

      if (parseFloat(balance) < 0.01) {
        console.warn(
          "⚠️  WARNING: Low wallet balance. Please add funds for gas.\n"
        );
      }

      console.log("✓ Oracle connection initialized\n");
      return true;
    } catch (error) {
      console.error("Failed to initialize oracle connection:", error.message);
      this.stats.lastError = error.message;
      return false;
    }
  }

  /**
   * Runs the complete update pipeline once
   * @param {number} maxTokens - Maximum tokens to process in this run
   * @returns {Promise<Object>} Run statistics
   */
  async runUpdateCycle(maxTokens = null) {
    const tokensToProcess = maxTokens || this.config.maxTokensPerRun;

    console.log("=".repeat(60));
    console.log("STARTING UPDATE CYCLE");
    console.log("=".repeat(60));
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Run #${this.stats.totalRuns + 1}\n`);

    this.isRunning = true;
    const startTime = Date.now();
    const runStats = {
      tokensFound: 0,
      tokensProcessed: 0,
      valuationsCalculated: 0,
      updatesAttempted: 0,
      updatesSuccessful: 0,
      updatesSkipped: 0,
      updatesFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Step 1: Get all fractional token addresses from subgraph
      console.log("📊 Step 1: Fetching fractional tokens from subgraph...\n");
      const allTokenAddresses =
        await getAllFractionalTokenAddresses(tokensToProcess);
      runStats.tokensFound = allTokenAddresses.length;

      if (allTokenAddresses.length === 0) {
        console.log("No tokens found in subgraph. Ending cycle.\n");
        this.isRunning = false;
        return runStats;
      }

      // Step 2: Process each token through the pipeline
      console.log(
        `🔄 Step 2: Processing ${allTokenAddresses.length} tokens...\n`
      );

      const priceUpdates = [];

      for (let i = 0; i < allTokenAddresses.length; i++) {
        const tokenAddress = allTokenAddresses[i];
        console.log(`[${i + 1}/${allTokenAddresses.length}] ${tokenAddress}`);

        try {
          // Collect data from subgraph
          const domainData = await fetchDomainDataByToken(tokenAddress);
          runStats.tokensProcessed++;

          // Calculate valuation using AI engine
          const valuation = calculateDomaValue(domainData);
          runStats.valuationsCalculated++;

          console.log(`  Domain: ${domainData.domainName}`);
          console.log(
            `  Calculated Price: ${valuation.humanReadable.priceInETH} ETH`
          );
          console.log(
            `  Quality Score: ${valuation.breakdown.domainScore}/100`
          );

          // Add to batch update list
          priceUpdates.push({
            tokenAddress,
            price: valuation.priceUSD18Decimals,
            domainName: domainData.domainName,
          });

          console.log("  ✓ Processed successfully\n");
        } catch (error) {
          console.error(`  ✗ Error processing token: ${error.message}\n`);
          runStats.errors.push({
            tokenAddress,
            stage: "processing",
            error: error.message,
          });
        }
      }

      // Step 3: Update oracle with calculated prices
      if (priceUpdates.length > 0 && this.oracleUpdater) {
        console.log(
          `\n⛓️  Step 3: Updating oracle with ${priceUpdates.length} prices...\n`
        );

        const updateResults =
          await this.oracleUpdater.updateMultipleTokenPrices(
            priceUpdates,
            this.config.delayBetweenUpdates
          );

        runStats.updatesAttempted = updateResults.total;
        runStats.updatesSuccessful = updateResults.successful;
        runStats.updatesSkipped = updateResults.skipped;
        runStats.updatesFailed = updateResults.failed;

        // Add failed updates to errors
        updateResults.transactions
          .filter((tx) => !tx.success)
          .forEach((tx) => {
            runStats.errors.push({
              tokenAddress: tx.tokenAddress,
              stage: "oracle_update",
              error: tx.error,
            });
          });
      } else {
        console.log("\n⊘ Skipping oracle updates (no prices to update)\n");
      }

      // Calculate duration
      runStats.duration = Date.now() - startTime;

      // Update global stats
      this.stats.totalRuns++;
      this.stats.totalTokensProcessed += runStats.tokensProcessed;
      this.stats.totalUpdatesSuccessful += runStats.updatesSuccessful;
      this.stats.totalUpdatesFailed += runStats.updatesFailed;
      this.stats.lastRunTime = new Date().toISOString();

      // Print summary
      this._printRunSummary(runStats);

      return runStats;
    } catch (error) {
      console.error("Fatal error in update cycle:", error.message);
      this.stats.lastError = error.message;
      runStats.errors.push({
        stage: "cycle",
        error: error.message,
      });
      return runStats;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Starts the automatic scheduler
   */
  startScheduler() {
    if (!this.config.enableScheduler) {
      console.log("Scheduler disabled in configuration");
      return;
    }

    if (this.schedulerInterval) {
      console.log("Scheduler already running");
      return;
    }

    console.log("=".repeat(60));
    console.log("STARTING ORACLE UPDATE SCHEDULER");
    console.log("=".repeat(60));
    console.log(
      `Update interval: ${this.config.updateInterval / 1000} seconds`
    );
    console.log(
      `Next update: ${new Date(Date.now() + this.config.updateInterval).toLocaleString()}`
    );
    console.log("=".repeat(60) + "\n");

    // Run first cycle immediately
    this.runUpdateCycle().catch((error) => {
      console.error("Error in scheduled run:", error);
    });

    // Schedule subsequent runs
    this.schedulerInterval = setInterval(async () => {
      if (!this.isRunning) {
        await this.runUpdateCycle().catch((error) => {
          console.error("Error in scheduled run:", error);
        });
      } else {
        console.log(
          "⊘ Skipping scheduled run (previous cycle still running)\n"
        );
      }
    }, this.config.updateInterval);

    console.log("✓ Scheduler started successfully\n");
  }

  /**
   * Stops the automatic scheduler
   */
  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log("✓ Scheduler stopped\n");
    }
  }

  /**
   * Gets current statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      schedulerActive: this.schedulerInterval !== null,
    };
  }

  /**
   * Prints run summary
   * @private
   */
  _printRunSummary(runStats) {
    console.log("\n" + "=".repeat(60));
    console.log("UPDATE CYCLE SUMMARY");
    console.log("=".repeat(60));
    console.log(`Duration: ${(runStats.duration / 1000).toFixed(2)}s`);
    console.log(`Tokens Found: ${runStats.tokensFound}`);
    console.log(`Tokens Processed: ${runStats.tokensProcessed}`);
    console.log(`Valuations Calculated: ${runStats.valuationsCalculated}`);
    console.log(`Oracle Updates Attempted: ${runStats.updatesAttempted}`);
    console.log(`  - Successful: ${runStats.updatesSuccessful}`);
    console.log(`  - Skipped: ${runStats.updatesSkipped}`);
    console.log(`  - Failed: ${runStats.updatesFailed}`);

    if (runStats.errors.length > 0) {
      console.log(`\nErrors: ${runStats.errors.length}`);
      runStats.errors.slice(0, 5).forEach((err, idx) => {
        console.log(
          `  ${idx + 1}. [${err.stage}] ${err.tokenAddress || "N/A"}: ${err.error}`
        );
      });
      if (runStats.errors.length > 5) {
        console.log(`  ... and ${runStats.errors.length - 5} more`);
      }
    }

    console.log("=".repeat(60) + "\n");
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "start";

  if (command === "once") {
    // Run once and exit
    console.log("Running single update cycle...\n");
    const orchestrator = new OracleOrchestrator({
      enableScheduler: false,
    });

    const initialized = await orchestrator.initialize();
    if (!initialized) {
      console.error("Failed to initialize. Exiting.");
      process.exit(1);
    }

    await orchestrator.runUpdateCycle();
    console.log("Single cycle completed. Exiting.\n");
    process.exit(0);
  } else if (command === "start") {
    // Start scheduler
    const orchestrator = new OracleOrchestrator();

    const initialized = await orchestrator.initialize();
    if (!initialized) {
      console.error("Failed to initialize. Exiting.");
      process.exit(1);
    }

    orchestrator.startScheduler();

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n\nReceived SIGINT, shutting down gracefully...");
      orchestrator.stopScheduler();

      console.log("\nFinal Statistics:");
      console.log(JSON.stringify(orchestrator.getStats(), null, 2));
      console.log("\nGoodbye!\n");

      process.exit(0);
    });

    // Keep process alive
    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception:", error);
    });
  } else {
    console.log("Usage:");
    console.log("  node orchestrator.js start  - Start scheduled updates");
    console.log("  node orchestrator.js once   - Run single update cycle");
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
