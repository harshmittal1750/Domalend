/**
 * @fileoverview Complete DomaLend Oracle Backend System
 * @description Integrates The Collector (data), The Brain (scoring), and The Messenger (on-chain)
 */

import { GraphQLClient, gql } from "graphql-request";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const DOMA_SUBGRAPH_URL =
  process.env.DOMA_SUBGRAPH_URL || "https://api-testnet.doma.xyz/graphql";
const DOMA_API_KEY = process.env.DOMA_API_KEY || "";
const RPC_PROVIDER_URL = process.env.RPC_URL || "https://rpc-testnet.doma.xyz";
const DOMA_RANK_ORACLE_ADDRESS = process.env.DOMA_RANK_ORACLE_ADDRESS || "";
const SIGNER_PRIVATE_KEY = process.env.ORACLE_UPDATER_PRIVATE_KEY || "";

// DomaRankOracle ABI (minimal)
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
];

// Premium TLDs with their scores (out of 10)
const PREMIUM_TLDS = new Map([
  ["com", 10],
  ["net", 9],
  ["org", 9],
  ["io", 10],
  ["ai", 10],
  ["xyz", 8],
  ["app", 9],
  ["dev", 9],
  ["co", 8],
  ["tech", 8],
]);

// Premium keywords with their scores (out of 10)
const PREMIUM_KEYWORDS = new Map([
  ["crypto", 10],
  ["nft", 10],
  ["defi", 10],
  ["web3", 10],
  ["blockchain", 10],
  ["dao", 9],
  ["token", 9],
  ["meta", 9],
  ["digital", 8],
  ["smart", 8],
  ["finance", 8],
  ["exchange", 9],
  ["wallet", 9],
  ["market", 8],
  ["invest", 8],
]);

// ============================================================================
// PART 1: THE COLLECTOR - Data Collection
// ============================================================================

// Initialize GraphQL client with API key authentication
const graphQLClient = new GraphQLClient(DOMA_SUBGRAPH_URL, {
  headers: DOMA_API_KEY
    ? {
        "API-KEY": DOMA_API_KEY,
        "Content-Type": "application/json",
      }
    : {
        "Content-Type": "application/json",
      },
});

/**
 * PHASE 1: Discovery Query - Get list of all fractional tokens
 * Fetches basic info about all fractionalized domains
 */
const GET_FRACTIONAL_TOKENS = gql`
  query GetFractionalTokenList {
    fractionalTokens {
      items {
        name
        address
        fractionalizedAt
        currentPrice
        params {
          totalSupply
          name
          symbol
        }
      }
      totalCount
      pageSize
      currentPage
      totalPages
      hasPreviousPage
      hasNextPage
    }
  }
`;

/**
 * PHASE 2: Analysis Query - Get detailed info for a specific domain
 * Fetches expiry date and market demand data
 */
const GET_NAME_DETAILS = gql`
  query GetNameDetails($domainName: String!) {
    names(name: $domainName) {
      items {
        name
        expiresAt
        activeOffersCount
        highestOffer {
          price
        }
        isFractionalized
        fractionalTokenInfo {
          address
          currentPrice
        }
      }
    }
  }
`;

/**
 * PHASE 1: Fetch all fractional tokens (Discovery)
 * Gets the list of all fractionalized domains with basic info
 */
async function getAllFractionalTokens() {
  try {
    console.log("📡 Phase 1: Discovering fractional tokens...");

    const data = await graphQLClient.request(GET_FRACTIONAL_TOKENS);

    if (!data.fractionalTokens || !data.fractionalTokens.items) {
      console.log("No fractional tokens found in response");
      return [];
    }

    const tokens = data.fractionalTokens.items;
    console.log(`✓ Discovered ${tokens.length} fractional tokens\n`);

    return tokens;
  } catch (error) {
    console.error("Error in Phase 1 (Discovery):", error.message);
    if (error.response) {
      console.error(
        "API Error:",
        JSON.stringify(error.response.errors, null, 2)
      );
    }
    return [];
  }
}

/**
 * PHASE 2: Fetch detailed name info for a specific domain (Analysis)
 * Gets expiry date and market demand data
 */
async function getNameDetails(domainName) {
  try {
    const data = await graphQLClient.request(GET_NAME_DETAILS, {
      domainName: domainName,
    });

    if (!data.names || !data.names.items || data.names.items.length === 0) {
      return null;
    }

    return data.names.items[0];
  } catch (error) {
    console.log(`Could not fetch details for ${domainName}: ${error.message}`);
    return null;
  }
}

/**
 * Parse domain name to extract TLD and calculate length
 * @param {string} name - Domain name (e.g., "example.com" or just "example")
 * @returns {Object} Parsed domain info
 */
function parseDomainName(name) {
  if (!name) return { domainName: "unknown", tld: "unknown", length: 0 };

  // Remove common extensions and parse
  const parts = name.toLowerCase().split(".");

  if (parts.length >= 2) {
    const tld = parts[parts.length - 1];
    const domainName = parts.slice(0, -1).join(".");
    return {
      domainName: domainName,
      tld: tld,
      length: domainName.length,
    };
  }

  // No TLD found, treat entire string as domain name
  return {
    domainName: name,
    tld: "unknown",
    length: name.length,
  };
}

/**
 * Consolidate all domain data using TWO-PHASE approach
 * Phase 1: Get all fractional tokens (Discovery)
 * Phase 2: Get detailed name info for each token (Analysis)
 * @returns {Promise<Array>} Array of consolidated domain data
 */
async function getConsolidatedDomainData() {
  console.log("📊 Starting TWO-PHASE data collection from Doma API...\n");

  // PHASE 1: Discovery - Get all fractional tokens
  const tokens = await getAllFractionalTokens();

  if (tokens.length === 0) {
    console.log("No tokens found in Phase 1");
    return [];
  }

  console.log("🔬 Phase 2: Analyzing each domain...\n");

  const consolidatedData = [];
  const currentTime = Math.floor(Date.now() / 1000);

  // PHASE 2: Analysis - Get detailed info for each token
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const domainName = token.name || token.params?.name;

    if (!domainName) {
      console.log(`⊘ Skipping token ${i + 1}: No domain name`);
      continue;
    }

    // Parse domain name and TLD
    const domainInfo = parseDomainName(domainName);

    // Fetch detailed name information (Phase 2)
    const nameDetails = await getNameDetails(domainName);

    // Parse fractionalization date
    const fractionalizedAt = token.fractionalizedAt
      ? new Date(token.fractionalizedAt).getTime() / 1000
      : 0;

    // Calculate years on chain
    const yearsOnChain =
      fractionalizedAt > 0
        ? (currentTime - fractionalizedAt) / (365.25 * 24 * 60 * 60)
        : 0;

    // Calculate years until expiry from Phase 2 data
    let yearsUntilExpiry = 1; // Default estimate
    if (nameDetails && nameDetails.expiresAt) {
      const expiryTime = new Date(nameDetails.expiresAt).getTime() / 1000;
      if (expiryTime > currentTime) {
        yearsUntilExpiry = (expiryTime - currentTime) / (365.25 * 24 * 60 * 60);
      }
    }

    // Get active offers count from Phase 2 data
    const activeOffersCount = nameDetails?.activeOffersCount || 0;

    // Parse current price - IMPORTANT: currentPrice is in token's smallest unit
    // Must divide by 10^decimals to get actual USD price
    const decimals = token.params?.decimals || 6;
    const currentPriceRaw = parseFloat(token.currentPrice || "0");
    const livePriceUSD = currentPriceRaw / Math.pow(10, decimals);

    console.log(
      `  💰 ${domainName}: ${currentPriceRaw} raw → $${livePriceUSD.toFixed(2)} USD (decimals: ${decimals})`
    );

    consolidatedData.push({
      fractionalTokenAddress: token.address,
      domainName: domainInfo.domainName,
      tld: domainInfo.tld,
      nameLength: domainInfo.length,
      yearsOnChain: parseFloat(yearsOnChain.toFixed(2)),
      yearsUntilExpiry: parseFloat(yearsUntilExpiry.toFixed(2)),
      salesHistoryCount: 0, // Not available in current queries
      activeOffersCount: activeOffersCount,
      livePriceUSD: livePriceUSD,
      totalSupply: token.params?.totalSupply?.toString() || "0",
      symbol: token.params?.symbol || "",
    });

    console.log(
      `✓ [${i + 1}/${tokens.length}] ${domainName} - Price: $${livePriceUSD.toFixed(2)}, Offers: ${activeOffersCount}`
    );

    // Small delay to avoid rate limiting
    if (i < tokens.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(
    `\n✅ Consolidated data for ${consolidatedData.length} domains\n`
  );
  return consolidatedData;
}

// ============================================================================
// PART 2: THE BRAIN - Scoring Algorithm
// ============================================================================

/**
 * Calculate TLD score based on premium TLD list
 * @param {string} tld - Top-level domain
 * @returns {number} Score from 0-10
 */
function calculateTldScore(tld) {
  const normalizedTld = tld.toLowerCase();
  return PREMIUM_TLDS.get(normalizedTld) || 4;
}

/**
 * Calculate keyword score based on domain name
 * @param {string} domainName - Full domain name
 * @returns {number} Score from 0-10
 */
function calculateKeywordScore(domainName) {
  const normalized = domainName.toLowerCase();
  let maxScore = 4; // Default score

  for (const [keyword, score] of PREMIUM_KEYWORDS.entries()) {
    if (normalized.includes(keyword)) {
      maxScore = Math.max(maxScore, score);
    }
  }

  return maxScore;
}

/**
 * Calculate length score based on domain name length
 * @param {number} length - Domain name length
 * @returns {number} Score from 0-10
 */
function calculateLengthScore(length) {
  if (length >= 1 && length <= 5) return 10;
  if (length >= 6 && length <= 10) return 7;
  return 4;
}

/**
 * Calculate DomaRank and final valuation for a domain
 * @param {Object} domainData - Consolidated domain data
 * @returns {Object} Contains domaRank, finalValuationUSD, and breakdown
 */
function calculateDomaRank(domainData) {
  // ========================================
  // 1. Age & Longevity Score (out of 10)
  // ========================================
  const ageComponent = Math.min(domainData.yearsOnChain * 2, 5);
  const expiryComponent = Math.min(domainData.yearsUntilExpiry * 1, 5);
  const ageScore = ageComponent + expiryComponent;

  // ========================================
  // 2. Market Demand Score (out of 10)
  // ========================================
  const demandScore = Math.min(domainData.activeOffersCount * 2, 10);

  // ========================================
  // 3. Keyword & TLD Score (out of 10)
  // ========================================
  const tldScore = calculateTldScore(domainData.tld);
  const keywordScore = calculateKeywordScore(domainData.domainName);
  const lengthScore = calculateLengthScore(domainData.nameLength);

  const combinedKeywordScore =
    tldScore * 0.5 + keywordScore * 0.3 + lengthScore * 0.2;

  // ========================================
  // 4. Final DomaRank (out of 100)
  // ========================================
  const domaRank = ageScore * 2 + demandScore * 5 + combinedKeywordScore * 3;

  // ========================================
  // 5. Risk-Adjusted Valuation
  // ========================================
  const riskAdjustmentFactor = domaRank / 100;
  const finalValuationUSD = domainData.livePriceUSD * riskAdjustmentFactor;

  // Log calculation breakdown
  console.log(`\n  📊 DomaRank Calculation for ${domainData.domainName}:`);
  console.log(`    Age Score: ${ageScore.toFixed(2)}/10`);
  console.log(`    Demand Score: ${demandScore.toFixed(2)}/10`);
  console.log(`    Keyword Score: ${combinedKeywordScore.toFixed(2)}/10`);
  console.log(`    → DomaRank: ${domaRank.toFixed(2)}/100`);
  console.log(
    `    → Risk Adjustment: ${(riskAdjustmentFactor * 100).toFixed(2)}%`
  );
  console.log(`    Live Market Price: $${domainData.livePriceUSD.toFixed(2)}`);
  console.log(`    AI Oracle Price: $${finalValuationUSD.toFixed(2)}`);
  console.log(
    `    Safety Margin: ${((1 - riskAdjustmentFactor) * 100).toFixed(2)}%\n`
  );

  // Convert to 18 decimals for blockchain
  const finalValuationWei = ethers.parseUnits(
    finalValuationUSD.toFixed(18),
    18
  );

  return {
    fractionalTokenAddress: domainData.fractionalTokenAddress,
    domainName: domainData.domainName,
    domaRank: parseFloat(domaRank.toFixed(2)),
    finalValuationUSD: parseFloat(finalValuationUSD.toFixed(6)),
    finalValuationWei: finalValuationWei.toString(),
    breakdown: {
      ageScore: parseFloat(ageScore.toFixed(2)),
      demandScore: parseFloat(demandScore.toFixed(2)),
      keywordScore: parseFloat(combinedKeywordScore.toFixed(2)),
      tldScore: parseFloat(tldScore.toFixed(2)),
      lengthScore: parseFloat(lengthScore.toFixed(2)),
      riskAdjustmentFactor: parseFloat(riskAdjustmentFactor.toFixed(4)),
      livePriceUSD: domainData.livePriceUSD,
    },
  };
}

// ============================================================================
// PART 3: THE MESSENGER - On-Chain Broadcasting
// ============================================================================

/**
 * Broadcast calculated prices to the DomaRankOracle smart contract
 * @param {Array} valuations - Array of valuation objects
 */
async function broadcastPricesOnChain(valuations) {
  console.log("\n⛓️  Starting on-chain price broadcasting...\n");

  // Validate configuration
  if (!DOMA_RANK_ORACLE_ADDRESS) {
    console.error("❌ DOMA_RANK_ORACLE_ADDRESS not configured!");
    return;
  }

  if (!SIGNER_PRIVATE_KEY) {
    console.error("❌ SIGNER_PRIVATE_KEY not configured!");
    return;
  }

  try {
    // Initialize ethers provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_PROVIDER_URL);
    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);

    console.log(`Broadcaster address: ${wallet.address}`);

    // Get wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance === 0n) {
      console.error("❌ Insufficient balance for gas fees!");
      return;
    }

    // Instantiate the DomaRankOracle contract
    const oracleContract = new ethers.Contract(
      DOMA_RANK_ORACLE_ADDRESS,
      DOMA_RANK_ORACLE_ABI,
      wallet
    );

    let successCount = 0;
    let failureCount = 0;

    // Loop through valuations and update on-chain
    for (let i = 0; i < valuations.length; i++) {
      const valuation = valuations[i];
      const { fractionalTokenAddress, domainName, finalValuationWei } =
        valuation;

      console.log(
        `[${i + 1}/${valuations.length}] Broadcasting ${domainName}...`
      );
      console.log(`  Address: ${fractionalTokenAddress}`);
      console.log(
        `  Price: $${valuation.finalValuationUSD} (${finalValuationWei} Wei)`
      );

      try {
        // Get current on-chain price
        let currentPrice = 0n;
        try {
          currentPrice = await oracleContract.getTokenValue(
            fractionalTokenAddress
          );
          console.log(
            `  Current on-chain: ${ethers.formatUnits(currentPrice, 18)} USD`
          );
        } catch (err) {
          console.log(`  Current on-chain: Not set yet`);
        }

        // Calculate price change
        const newPrice = BigInt(finalValuationWei);
        if (currentPrice > 0n) {
          const changePercent =
            Number(((newPrice - currentPrice) * 10000n) / currentPrice) / 100;
          console.log(`  Price change: ${changePercent.toFixed(2)}%`);

          // Skip if change is less than 1%
          if (Math.abs(changePercent) < 1) {
            console.log(`  ⊘ Skipping (insignificant change)\n`);
            continue;
          }
        }

        // Send transaction
        const tx = await oracleContract.updateTokenValue(
          fractionalTokenAddress,
          finalValuationWei
        );

        console.log(`  Transaction hash: ${tx.hash}`);
        console.log(`  Waiting for confirmation...`);

        // Wait for transaction to be mined
        const receipt = await tx.wait();

        console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`);
        console.log(`  Gas used: ${receipt.gasUsed.toString()}\n`);

        successCount++;

        // Add delay between transactions to avoid rate limiting
        if (i < valuations.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}\n`);
        failureCount++;
      }
    }

    console.log("=".repeat(60));
    console.log("BROADCASTING SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total valuations: ${valuations.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Skipped: ${valuations.length - successCount - failureCount}`);
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("Fatal error in broadcasting:", error.message);
    throw error;
  }
}

// ============================================================================
// PART 4: MAIN EXECUTION LOOP
// ============================================================================

/**
 * Main orchestration function
 * Runs the complete pipeline: Collection → Scoring → Broadcasting
 */
async function main() {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(60));
  console.log("DOMALEND ORACLE BACKEND - EXECUTION CYCLE");
  console.log("=".repeat(60));
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    // ========================================
    // Step 1: Collect domain data
    // ========================================
    const consolidatedData = await getConsolidatedDomainData();

    if (consolidatedData.length === 0) {
      console.log("⚠️  No domain data collected. Ending cycle.\n");
      return;
    }

    // ========================================
    // Step 2: Calculate valuations using The Brain
    // ========================================
    console.log("🧠 Calculating DomaRank scores and valuations...\n");

    const valuations = [];

    for (const domainData of consolidatedData) {
      const valuation = calculateDomaRank(domainData);
      valuations.push(valuation);

      console.log(`✓ ${valuation.domainName}`);
      console.log(`  DomaRank: ${valuation.domaRank}/100`);
      console.log(`  Valuation: $${valuation.finalValuationUSD}`);
      console.log(
        `  Breakdown: Age=${valuation.breakdown.ageScore}, Demand=${valuation.breakdown.demandScore}, Keywords=${valuation.breakdown.keywordScore}\n`
      );
    }

    console.log(`✅ Calculated ${valuations.length} valuations\n`);

    // ========================================
    // Step 3: Broadcast prices on-chain
    // ========================================
    if (valuations.length > 0) {
      await broadcastPricesOnChain(valuations);
    }

    // ========================================
    // Cycle complete
    // ========================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("=".repeat(60));
    console.log("CYCLE COMPLETE");
    console.log("=".repeat(60));
    console.log(`Duration: ${duration}s`);
    console.log(`Next cycle in 10 minutes`);
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Fatal error in main execution:");
    console.error(error);
    console.error("\nRetrying in 10 minutes...\n");
  }
}

// ============================================================================
// STARTUP & SCHEDULING
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("DOMALEND ORACLE BACKEND SYSTEM");
console.log("=".repeat(60));
console.log("Status: Starting up...");
console.log(`Subgraph: ${DOMA_SUBGRAPH_URL}`);
console.log(`API Key: ${DOMA_API_KEY ? "✓ Configured" : "⚠️  Not Set"}`);
console.log(`RPC: ${RPC_PROVIDER_URL}`);
console.log(`Oracle: ${DOMA_RANK_ORACLE_ADDRESS || "NOT CONFIGURED"}`);
console.log("=".repeat(60) + "\n");

// Validation
if (!DOMA_API_KEY) {
  console.warn("⚠️  WARNING: DOMA_API_KEY not set!");
  console.warn("    The Doma Subgraph API requires authentication.");
  console.warn("    Set DOMA_API_KEY in your .env file to query the API.\n");
}

if (!DOMA_RANK_ORACLE_ADDRESS) {
  console.warn("⚠️  WARNING: DOMA_RANK_ORACLE_ADDRESS not set!");
  console.warn("    Price broadcasting will be skipped.");
  console.warn("    Set this in your .env file to enable on-chain updates.\n");
}

if (!SIGNER_PRIVATE_KEY) {
  console.warn("⚠️  WARNING: ORACLE_UPDATER_PRIVATE_KEY not set!");
  console.warn("    Price broadcasting will be skipped.");
  console.warn("    Set this in your .env file to enable on-chain updates.\n");
}

// Run immediately on startup
console.log("▶️  Running first cycle immediately...\n");
main().catch((error) => {
  console.error("Error in initial execution:", error);
});

// Schedule to run every 10 minutes
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
console.log(`⏰ Scheduling automatic runs every 10 minutes\n`);

setInterval(() => {
  main().catch((error) => {
    console.error("Error in scheduled execution:", error);
  });
}, INTERVAL_MS);

// Graceful shutdown handler
process.on("SIGINT", () => {
  console.log("\n\n⛔ Shutdown signal received");
  console.log("Cleaning up and exiting...");
  console.log("Goodbye! 👋\n");
  process.exit(0);
});

// Export functions for testing
export {
  getConsolidatedDomainData,
  calculateDomaRank,
  broadcastPricesOnChain,
  main,
};
