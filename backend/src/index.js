/**
 * @fileoverview Main entry point for the DomaRank Oracle Backend Service
 * @description Orchestrates data collection and oracle updates
 */

import {
  fetchDomainDataByToken,
  calculateSalesStatistics,
} from "./dataCollector.js";
import { calculateDomaValue, calculateDomainScore } from "./pricingEngine.js";
import dotenv from "dotenv";

dotenv.config();

console.log("=== DomaRank Oracle Backend Service ===\n");

/**
 * Main service initialization
 */
async function initializeService() {
  console.log("Service initialized successfully!");
  console.log("Ready to collect data from Doma Subgraph\n");

  // Check configuration
  const subgraphUrl = process.env.DOMA_SUBGRAPH_URL;
  if (!subgraphUrl || subgraphUrl.includes("<YOUR_SUBGRAPH_ID>")) {
    console.warn("⚠️  Warning: DOMA_SUBGRAPH_URL not configured properly");
    console.log(
      "Please update your .env file with the correct Doma Subgraph endpoint\n"
    );
  } else {
    console.log("✓ Subgraph URL configured");
  }

  // Display available functionality
  console.log("Available functions:");
  console.log("- fetchDomainDataByToken(tokenAddress)");
  console.log("- calculateSalesStatistics(domainData)");
  console.log("- calculateDomaValue(domainData)");
  console.log("- calculateDomainScore(domainData)");
  console.log("\nAvailable commands:");
  console.log("- npm run collect         (Collect data from subgraph)");
  console.log("- npm run test-pricing    (Test pricing engine with mock data)");
  console.log("Or import functions in your own scripts\n");
}

// Start the service
initializeService().catch((error) => {
  console.error("Failed to initialize service:", error);
  process.exit(1);
});

// Keep the process running
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

// Export for use in other modules
export {
  fetchDomainDataByToken,
  calculateSalesStatistics,
  calculateDomaValue,
  calculateDomainScore,
};
