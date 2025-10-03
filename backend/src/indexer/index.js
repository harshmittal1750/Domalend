import { EventIndexer } from "./EventIndexer.js";
import { IndexerServer } from "./IndexerServer.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Main entry point for the DreamLend Indexer
 * Indexes loan events and serves them via REST/GraphQL API
 */

// Configuration
const CONFIG = {
  // Blockchain connection
  rpcUrl: process.env.RPC_URL || "https://rpc-testnet.doma.xyz",
  contractAddress:
    process.env.DREAM_LEND_CONTRACT_ADDRESS ||
    "0x9F1694E8a8aC038d4ab3e2217AC0E79111948FD9",
  startBlock: parseInt(process.env.INDEXER_START_BLOCK || "0"),
  pollInterval: parseInt(process.env.INDEXER_POLL_INTERVAL || "5000"),

  // Server
  serverPort: parseInt(process.env.INDEXER_PORT || "3001"),
  corsOrigin: process.env.INDEXER_CORS_ORIGIN || "*",
};

// Load DreamLend ABI
let dreamLendABI;
try {
  const abiPath = path.join(
    __dirname,
    "../../../contracts/out/DreamLend.sol/DreamLend.json"
  );
  const abiFile = fs.readFileSync(abiPath, "utf8");
  const abiJson = JSON.parse(abiFile);
  dreamLendABI = abiJson.abi;
  console.log("✓ Loaded DreamLend ABI");
} catch (error) {
  console.error("Error loading DreamLend ABI:", error.message);
  console.error("Please ensure the contract is compiled:");
  console.error("  cd contracts && forge build");
  process.exit(1);
}

// Validate configuration
if (
  !CONFIG.contractAddress ||
  CONFIG.contractAddress === "YOUR_DEPLOYED_CONTRACT_ADDRESS"
) {
  console.error("❌ Error: DREAM_LEND_CONTRACT_ADDRESS not set in .env");
  console.error("Please set your deployed DreamLend contract address");
  process.exit(1);
}

console.log("\n" + "=".repeat(60));
console.log("🚀 DREAMLEND INDEXER");
console.log("=".repeat(60));
console.log("Configuration:");
console.log(`  RPC URL: ${CONFIG.rpcUrl}`);
console.log(`  Contract: ${CONFIG.contractAddress}`);
console.log(`  Start Block: ${CONFIG.startBlock}`);
console.log(`  Poll Interval: ${CONFIG.pollInterval}ms`);
console.log(`  Server Port: ${CONFIG.serverPort}`);
console.log("=".repeat(60) + "\n");

// Initialize indexer
const indexer = new EventIndexer({
  rpcUrl: CONFIG.rpcUrl,
  contractAddress: CONFIG.contractAddress,
  contractABI: dreamLendABI,
  startBlock: CONFIG.startBlock,
  pollInterval: CONFIG.pollInterval,
});

// Initialize server
const server = new IndexerServer({
  port: CONFIG.serverPort,
  indexer: indexer,
  cors: {
    origin: CONFIG.corsOrigin,
  },
});

// Event listeners
indexer.on("started", () => {
  console.log("✓ Indexer started");
});

indexer.on("synced", ({ fromBlock, toBlock, loansIndexed }) => {
  console.log(
    `✓ Synced blocks ${fromBlock}-${toBlock}: ${loansIndexed} loans indexed`
  );
});

indexer.on("newEvents", ({ count, toBlock }) => {
  console.log(`📦 Indexed ${count} new events up to block ${toBlock}`);
});

indexer.on("loanCreated", (loan) => {
  console.log(
    `  📄 New loan created: ID=${loan.loanId}, Amount=${loan.amount}`
  );
});

indexer.on("loanAccepted", (loan) => {
  console.log(
    `  ✅ Loan accepted: ID=${loan.loanId}, Borrower=${loan.borrower}`
  );
});

indexer.on("loanRepaid", (loan) => {
  console.log(`  💰 Loan repaid: ID=${loan.loanId}`);
});

indexer.on("loanLiquidated", (loan) => {
  console.log(`  ⚠️  Loan liquidated: ID=${loan.loanId}`);
});

indexer.on("loanCancelled", (loan) => {
  console.log(`  ❌ Loan cancelled: ID=${loan.loanId}`);
});

indexer.on("error", (error) => {
  console.error("❌ Indexer error:", error);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("\n🛑 Shutting down...");

  indexer.stopIndexing();
  await server.stop();

  console.log("✓ Shutdown complete");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start everything
async function main() {
  try {
    // Initialize indexer
    await indexer.initialize();

    // Start indexing
    await indexer.startIndexing();

    // Start server
    await server.start();

    console.log("✅ DreamLend Indexer is running!");
    console.log("   - Indexing blockchain events");
    console.log("   - Serving data via GraphQL and REST APIs");
    console.log(`   - Access: http://localhost:${CONFIG.serverPort}`);
    console.log("\nPress Ctrl+C to stop\n");
  } catch (error) {
    console.error("❌ Failed to start indexer:", error);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Export for programmatic use
export { indexer, server, CONFIG };
