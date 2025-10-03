/**
 * @fileoverview Production Server - Unified Entry Point
 * @description Runs both the Indexer (GraphQL API) and AI Oracle (background service) in a single process
 * Optimized for Railway deployment
 */

import { EventIndexer } from "./indexer/EventIndexer.js";
import { IndexerServer } from "./indexer/IndexerServer.js";
import { OracleOrchestrator } from "./orchestrator.js";
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

  // Oracle Configuration
  enableOracle:
    process.env.ENABLE_ORACLE !== "false" && // Allow disabling via env
    process.env.DOMA_RANK_ORACLE_ADDRESS && // Must have oracle address
    process.env.ORACLE_UPDATER_PRIVATE_KEY, // Must have private key
  oracleUpdateInterval: parseInt(process.env.UPDATE_INTERVAL_MS || "300000"), // 5 minutes
};

console.log("\n" + "=".repeat(60));
console.log("🚀 DREAMLEND PRODUCTION SERVER");
console.log("=".repeat(60));
console.log("Configuration:");
console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`  Port: ${CONFIG.port}`);
console.log(`  RPC URL: ${CONFIG.rpcUrl}`);
console.log(`  Contract: ${CONFIG.contractAddress}`);
console.log(`  Indexer Start Block: ${CONFIG.startBlock}`);
console.log(`  Oracle Enabled: ${CONFIG.enableOracle}`);
if (CONFIG.enableOracle) {
  console.log(
    `  Oracle Update Interval: ${CONFIG.oracleUpdateInterval / 1000}s`
  );
}
console.log("=".repeat(60) + "\n");

// ============================================================================
// LOAD CONTRACT ABI
// ============================================================================

let dreamLendABI;
try {
  // Try multiple locations for the ABI file
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

// Initialize Oracle Orchestrator (if enabled)
let oracleOrchestrator = null;
if (CONFIG.enableOracle) {
  console.log("🤖 Initializing AI Oracle...");
  oracleOrchestrator = new OracleOrchestrator({
    updateInterval: CONFIG.oracleUpdateInterval,
    enableScheduler: true,
  });
} else {
  console.log(
    "⊘ AI Oracle disabled (missing DOMA_RANK_ORACLE_ADDRESS or ORACLE_UPDATER_PRIVATE_KEY)\n"
  );
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Indexer events
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

  // Stop oracle if running
  if (oracleOrchestrator) {
    oracleOrchestrator.stopScheduler();
    console.log("✓ Oracle scheduler stopped");
  }

  // Stop server
  await server.stop();
  console.log("✓ API server stopped");

  console.log("\n✓ Shutdown complete. Goodbye! 👋\n");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Handle uncaught errors
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
    console.log("🚀 Starting services...\n");

    // Step 1: Initialize and start indexer
    console.log("Step 1: Initializing blockchain indexer...");
    await indexer.initialize();
    await indexer.startIndexing();
    console.log("✓ Indexer running\n");

    // Step 2: Start GraphQL/REST API server
    console.log("Step 2: Starting API server...");
    await server.start();
    console.log("✓ API server running\n");

    // Step 3: Initialize and start oracle (if enabled)
    if (oracleOrchestrator) {
      console.log("Step 3: Initializing AI Oracle...");
      const initialized = await oracleOrchestrator.initialize();

      if (initialized) {
        oracleOrchestrator.startScheduler();
        console.log("✓ AI Oracle running\n");
      } else {
        console.warn(
          "⚠️  Oracle initialization failed, running without oracle\n"
        );
      }
    }

    // Success!
    console.log("=".repeat(60));
    console.log("✅ ALL SERVICES RUNNING");
    console.log("=".repeat(60));
    console.log(`🌐 API Server: http://localhost:${CONFIG.port}`);
    console.log(`📊 GraphQL Endpoint: http://localhost:${CONFIG.port}/graphql`);
    console.log(`🏥 Health Check: http://localhost:${CONFIG.port}/health`);
    console.log(`📡 Indexer: Active (polling every ${CONFIG.pollInterval}ms)`);
    if (oracleOrchestrator) {
      console.log(
        `🤖 AI Oracle: Active (updating every ${CONFIG.oracleUpdateInterval / 1000}s)`
      );
    }
    console.log("=".repeat(60));
    console.log("\nPress Ctrl+C to stop all services\n");

    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    console.error("❌ Failed to start services:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// ============================================================================
// START THE SERVER
// ============================================================================

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

// Export for testing
export { indexer, server, oracleOrchestrator, CONFIG };
