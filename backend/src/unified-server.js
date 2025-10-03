/**
 * @fileoverview Unified Production Server
 * @description Combines Event Indexer (GraphQL API) with AI Oracle (Price Updates)
 */

import { EventIndexer } from "./indexer/EventIndexer.js";
import { IndexerServer } from "./indexer/IndexerServer.js";
import {
  getConsolidatedDomainData,
  calculateDomaRank,
  broadcastPricesOnChain,
} from "./oracle-backend.js";
import { CryptoPriceOracle } from "./cryptoPriceOracle.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Server Configuration
  port: parseInt(process.env.PORT || process.env.INDEXER_PORT || "3001"),
  corsOrigin: process.env.CORS_ORIGIN || process.env.INDEXER_CORS_ORIGIN || "*",

  // Indexer Configuration
  rpcUrl: process.env.RPC_URL || "https://rpc-testnet.doma.xyz",
  contractAddress:
    process.env.DREAM_LEND_CONTRACT_ADDRESS ||
    "0x9F1694E8a8aC038d4ab3e2217AC0E79111948FD9",
  startBlock: parseInt(process.env.INDEXER_START_BLOCK || "11472883"),
  pollInterval: parseInt(process.env.INDEXER_POLL_INTERVAL || "5000"),

  // AI Oracle Configuration (Domain Tokens)
  enableOracle:
    process.env.ENABLE_ORACLE !== "false" &&
    process.env.DOMA_RANK_ORACLE_ADDRESS &&
    process.env.ORACLE_UPDATER_PRIVATE_KEY,
  oracleUpdateInterval: parseInt(process.env.UPDATE_INTERVAL_MS || "600000"), // 10 minutes

  // Crypto Oracle Configuration (CoinGecko)
  enableCryptoOracle:
    process.env.ENABLE_CRYPTO_ORACLE !== "false" &&
    process.env.DOMA_RANK_ORACLE_ADDRESS &&
    process.env.ORACLE_UPDATER_PRIVATE_KEY,
  cryptoOracleUpdateInterval: parseInt(
    process.env.PRICE_UPDATE_INTERVAL_MS || "1800000"
  ), // 30 minutes
};

console.log("\n" + "=".repeat(60));
console.log("🚀 UNIFIED PRODUCTION SERVER");
console.log("=".repeat(60));
console.log("Configuration:");
console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`  Port: ${CONFIG.port}`);
console.log(`  RPC URL: ${CONFIG.rpcUrl}`);
console.log(`  Contract: ${CONFIG.contractAddress}`);
console.log(`  Indexer Start Block: ${CONFIG.startBlock}`);
console.log(`  AI Oracle (Domains) Enabled: ${CONFIG.enableOracle}`);
if (CONFIG.enableOracle) {
  console.log(
    `  AI Oracle Update Interval: ${CONFIG.oracleUpdateInterval / 1000}s`
  );
}
console.log(
  `  Crypto Oracle (CoinGecko) Enabled: ${CONFIG.enableCryptoOracle}`
);
if (CONFIG.enableCryptoOracle) {
  console.log(
    `  Crypto Oracle Update Interval: ${CONFIG.cryptoOracleUpdateInterval / 1000}s`
  );
}
console.log("=".repeat(60) + "\n");

// ============================================================================
// LOAD CONTRACT ABI
// ============================================================================

let dreamLendABI;
try {
  let abiPath = null;

  // Location 1: src/Dreamlend.json (for Railway if copied there)
  const srcPath = path.join(__dirname, "Dreamlend.json");
  if (fs.existsSync(srcPath)) {
    abiPath = srcPath;
  }

  // Location 2: contracts/abi/DreamLend.json (for Railway)
  if (!abiPath) {
    const railwayPath = path.join(__dirname, "../contracts/abi/DreamLend.json");
    if (fs.existsSync(railwayPath)) {
      abiPath = railwayPath;
    }
  }

  // Location 3: Original compiled location (for local dev)
  if (!abiPath) {
    const localPath = path.join(
      __dirname,
      "../../contracts/out/DreamLend.sol/DreamLend.json"
    );
    if (fs.existsSync(localPath)) {
      abiPath = localPath;
    }
  }

  if (!abiPath) {
    throw new Error("DreamLend.json not found in any expected location");
  }

  const abiFile = fs.readFileSync(abiPath, "utf8");
  const abiJson = JSON.parse(abiFile);
  dreamLendABI = abiJson.abi;
  console.log(`✓ Loaded DreamLend ABI from: ${abiPath}\n`);
} catch (error) {
  console.error("❌ Error loading DreamLend ABI:", error.message);
  console.error(
    "Please ensure the contract ABI exists in one of these locations:"
  );
  console.error("  - src/Dreamlend.json");
  console.error("  - contracts/abi/DreamLend.json");
  console.error("  - ../../contracts/out/DreamLend.sol/DreamLend.json");
  process.exit(1);
}

// Validate configuration
if (
  !CONFIG.contractAddress ||
  CONFIG.contractAddress === "YOUR_DEPLOYED_CONTRACT_ADDRESS"
) {
  console.error("❌ Error: DREAM_LEND_CONTRACT_ADDRESS not set");
  console.error("Please set your deployed DreamLend contract address in .env");
  process.exit(1);
}

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================

// Initialize Event Indexer
console.log("📊 Initializing Event Indexer...");
const indexer = new EventIndexer({
  rpcUrl: CONFIG.rpcUrl,
  contractAddress: CONFIG.contractAddress,
  contractABI: dreamLendABI,
  startBlock: CONFIG.startBlock,
  pollInterval: CONFIG.pollInterval,
});

// Initialize GraphQL/REST Server
console.log("🌐 Initializing API Server...");
const server = new IndexerServer({
  port: CONFIG.port,
  indexer: indexer,
  cors: {
    origin: CONFIG.corsOrigin,
  },
});

// ============================================================================
// AI ORACLE PRICE UPDATER (Domain Tokens)
// ============================================================================

let oracleInterval = null;

async function runOracleCycle() {
  console.log("\n" + "=".repeat(60));
  console.log("🤖 AI ORACLE - PRICE UPDATE CYCLE");
  console.log("=".repeat(60));
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Collect domain data from Doma API
    const consolidatedData = await getConsolidatedDomainData();

    if (consolidatedData.length === 0) {
      console.log("⚠️  No domain data collected. Skipping cycle.\n");
      return;
    }

    // Step 2: Calculate valuations using AI algorithm
    console.log("🧠 Calculating AI-powered valuations...\n");
    const valuations = [];

    for (const domainData of consolidatedData) {
      const valuation = calculateDomaRank(domainData);
      valuations.push(valuation);

      console.log(`✓ ${valuation.domainName}`);
      console.log(`  DomaRank: ${valuation.domaRank}/100`);
      console.log(`  AI Valuation: $${valuation.finalValuationUSD}`);
    }

    console.log(`\n✅ Calculated ${valuations.length} AI valuations\n`);

    // Step 3: Broadcast prices on-chain
    if (valuations.length > 0) {
      await broadcastPricesOnChain(valuations);
    }

    console.log("✓ Oracle cycle complete\n");
  } catch (error) {
    console.error("❌ Error in oracle cycle:", error.message);
  }
}

function startOracleScheduler() {
  if (!CONFIG.enableOracle) {
    console.log("⊘ AI Oracle disabled (missing required env variables)\n");
    return;
  }

  console.log("🤖 Starting AI Oracle Scheduler...");
  console.log(
    `   Update interval: ${CONFIG.oracleUpdateInterval / 1000} seconds\n`
  );

  // Run first cycle immediately
  runOracleCycle().catch((error) => {
    console.error("Error in initial oracle cycle:", error);
  });

  // Schedule subsequent runs
  oracleInterval = setInterval(() => {
    runOracleCycle().catch((error) => {
      console.error("Error in scheduled oracle cycle:", error);
    });
  }, CONFIG.oracleUpdateInterval);
}

function stopOracleScheduler() {
  if (oracleInterval) {
    clearInterval(oracleInterval);
    oracleInterval = null;
    console.log("✓ AI Oracle scheduler stopped");
  }
}

// ============================================================================
// CRYPTO ORACLE PRICE UPDATER (CoinGecko)
// ============================================================================

let cryptoOracle = null;

function startCryptoOracleScheduler() {
  if (!CONFIG.enableCryptoOracle) {
    console.log("⊘ Crypto Oracle disabled (missing required env variables)\n");
    return;
  }

  console.log("💰 Starting Crypto Oracle Scheduler (CoinGecko)...");
  console.log(
    `   Update interval: ${CONFIG.cryptoOracleUpdateInterval / 1000} seconds\n`
  );

  try {
    // Initialize crypto oracle
    cryptoOracle = new CryptoPriceOracle({
      updateIntervalMs: CONFIG.cryptoOracleUpdateInterval,
    });

    // Start the scheduler
    cryptoOracle.start();

    console.log("✓ Crypto Oracle scheduler started\n");
  } catch (error) {
    console.error("❌ Failed to start Crypto Oracle:", error.message);
    cryptoOracle = null;
  }
}

function stopCryptoOracleScheduler() {
  if (cryptoOracle) {
    cryptoOracle.stop();
    cryptoOracle = null;
    console.log("✓ Crypto Oracle scheduler stopped");
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

indexer.on("started", () => {
  console.log("✓ Indexer started - monitoring blockchain events");
});

indexer.on("synced", ({ fromBlock, toBlock, loansIndexed }) => {
  console.log(
    `✓ Historical sync complete: blocks ${fromBlock}-${toBlock}, ${loansIndexed} loans indexed`
  );
});

indexer.on("newEvents", ({ count, toBlock }) => {
  console.log(`📦 Indexed ${count} new events up to block ${toBlock}`);
});

indexer.on("loanCreated", (loan) => {
  console.log(`  📄 New loan: ID=${loan.loanId}, Amount=${loan.amount} wei`);
});

indexer.on("loanAccepted", (loan) => {
  console.log(`  ✅ Loan accepted: ID=${loan.loanId}`);
});

indexer.on("loanRepaid", (loan) => {
  console.log(`  💰 Loan repaid: ID=${loan.loanId}`);
});

indexer.on("loanLiquidated", (loan) => {
  console.log(`  ⚠️  Loan liquidated: ID=${loan.loanId}`);
});

indexer.on("error", (error) => {
  console.error("❌ Indexer error:", error.message);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = async () => {
  console.log("\n🛑 Shutting down gracefully...");

  // Stop indexer
  indexer.stopIndexing();

  // Stop AI oracle
  stopOracleScheduler();

  // Stop crypto oracle
  stopCryptoOracleScheduler();

  // Stop server
  await server.stop();
  console.log("✓ API server stopped");

  console.log("\n✓ Shutdown complete. Goodbye! 👋\n");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  console.error("Attempting graceful shutdown...");
  shutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
});

// ============================================================================
// MAIN STARTUP SEQUENCE
// ============================================================================

async function main() {
  try {
    console.log("🚀 Starting unified server...\n");

    // Step 1: Initialize and start indexer
    console.log("Step 1: Initializing blockchain indexer...");
    await indexer.initialize();
    await indexer.startIndexing();
    console.log("✓ Indexer running\n");

    // Step 2: Start GraphQL/REST API server
    console.log("Step 2: Starting API server...");
    await server.start();
    console.log("✓ API server running\n");

    // Step 3: Start AI Oracle (if enabled)
    if (CONFIG.enableOracle) {
      console.log("Step 3: Starting AI Oracle (Domain Tokens)...");
      startOracleScheduler();
      console.log("✓ AI Oracle running\n");
    }

    // Step 4: Start Crypto Oracle (if enabled)
    if (CONFIG.enableCryptoOracle) {
      console.log("Step 4: Starting Crypto Oracle (CoinGecko)...");
      startCryptoOracleScheduler();
      console.log("✓ Crypto Oracle running\n");
    }

    // Success!
    console.log("=".repeat(60));
    console.log("✅ ALL SERVICES RUNNING");
    console.log("=".repeat(60));
    console.log(`🌐 API Server: http://localhost:${CONFIG.port}`);
    console.log(`📊 GraphQL Endpoint: http://localhost:${CONFIG.port}/graphql`);
    console.log(`🏥 Health Check: http://localhost:${CONFIG.port}/health`);
    console.log(`📡 Indexer: Active (polling every ${CONFIG.pollInterval}ms)`);
    if (CONFIG.enableOracle) {
      console.log(
        `🤖 AI Oracle (Domains): Active (updating every ${CONFIG.oracleUpdateInterval / 1000}s)`
      );
    }
    if (CONFIG.enableCryptoOracle) {
      console.log(
        `💰 Crypto Oracle (CoinGecko): Active (updating every ${CONFIG.cryptoOracleUpdateInterval / 1000}s)`
      );
    }
    console.log("=".repeat(60));
    console.log("\nPress Ctrl+C to stop all services\n");

    process.stdin.resume();
  } catch (error) {
    console.error("❌ Failed to start services:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

// Export for testing
export { indexer, server, cryptoOracle, CONFIG };
