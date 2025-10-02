/**
 * @fileoverview Configuration example file
 * @description Copy this to config.js and fill in your values
 */

export const config = {
  // Doma Subgraph Configuration
  domaSubgraphUrl: "https://api-testnet.doma.xyz/graphql",

  // Doma API Key (REQUIRED for querying the subgraph)
  // Get your API key from Doma team or dashboard
  domaApiKey: "",

  // Test token address for development
  testTokenAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",

  // RPC Configuration (Doma Testnet)
  rpcUrl: "https://rpc-testnet.doma.xyz",

  // Oracle Contract Address (to be filled after deployment)
  domaRankOracleAddress: "",

  // Private key for oracle updates (keep secure!)
  oracleUpdaterPrivateKey: "",

  // Update interval in milliseconds (default: 5 minutes)
  updateIntervalMs: 300000,

  // Maximum tokens to process per update cycle
  maxTokensPerRun: 50,

  // Delay between individual oracle updates (ms)
  delayBetweenUpdates: 2000,

  // Minimum price change percentage to trigger update
  minPriceChangePercent: 1,
  domaSubgraphApiKey: "v1.",
};
