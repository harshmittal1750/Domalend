/**
 * @fileoverview Complete DomaLend Oracle Backend System
 * @description Integrates The Collector (data), The Brain (scoring), and The Messenger (on-chain)
 */

import { GraphQLClient, gql } from "graphql-request";
import { ethers } from "ethers";
import dotenv from "dotenv";
import { getTokenPriceUSD } from "./fetch-pool-price.js";

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
 * Fetches comprehensive info about all fractionalized domains
 *
 * New fields available:
 * - status: Token status (active, bought out, etc.)
 * - metadata: Rich metadata (image, links, title, description)
 * - poolAddress: Liquidity pool address
 * - chain: Network information
 * - graduatedAt: When token graduated from launchpad
 * - And many more pool/launchpad parameters
 */
const GET_FRACTIONAL_TOKENS = gql`
  query GetFractionalTokenList {
    fractionalTokens {
      items {
        id
        name
        address
        fractionalizedAt
        fractionalizedBy
        boughtOutAt
        boughtOutBy
        buyoutPrice
        status
        poolAddress
        graduatedAt
        launchpadAddress
        vestingWalletAddress
        chain {
          name
          networkId
          addressUrlTemplate
        }
        params {
          initialValuation
          quoteToken
          name
          symbol
          decimals
          totalSupply
          launchpadSupply
          launchpadFeeBps
          poolSupply
          poolFeeBps
          poolLiquidityLowerRangePercentBps
          poolLiquidityUpperRangePercentBps
          launchStartTime
          launchEndTime
          launchpadData
          bondingCurveModelImpl
          initialPrice
          finalPrice
          bondingCurveModelData
          liquidityMigratorImpl
          liquidityMigratorData
          hook
          vestingCliffSeconds
          vestingDurationSeconds
          initialPoolPrice
          buySellFeeRecipient
          metadataURI
        }
        fractionalizedTxHash
        boughtOutTxHash
        metadataURI
        metadata {
          image
          xLink
          primaryWebsite
          title
          description
          additionalWebsites {
            name
            url
          }
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
          buyoutPrice
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

    // Skip inactive/bought out domains (from old contract versions)
    // if (token.status && token.status !== "active") {
    //   console.log(
    //     `⊘ Skipping ${domainName}: Status is "${token.status}" (not active)`
    //   );
    //   continue;
    // }

    // Skip domains that have been bought out
    if (token.boughtOutAt) {
      console.log(
        `⊘ Skipping ${domainName}: Domain was bought out at ${token.boughtOutAt}`
      );
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

    // PHASE 3: Get REAL market price from Uniswap V3 pool
    let poolPrice = null;
    if (token.poolAddress && token.poolAddress !== ethers.ZeroAddress) {
      try {
        poolPrice = await getTokenPriceUSD(token.address, token.poolAddress);
        if (poolPrice) {
          console.log(
            `  🏊 Pool price fetched for ${domainName}: $${poolPrice.toFixed(6)}`
          );
        }
      } catch (err) {
        console.log(
          `  ⚠️ Failed to fetch pool price for ${domainName}:`,
          err.message
        );
      }
    }

    // Fallback: Calculate initial price from fractionalization params
    const initialValuation = Number(token.params?.initialValuation || 0);
    const totalSupply = Number(token.params?.totalSupply || 0);
    const decimals = Number(token.params?.decimals || 6);

    let initialPriceUSD = 0;
    if (totalSupply > 0 && initialValuation > 0) {
      initialPriceUSD = initialValuation / totalSupply;
    }

    // Use pool price (REAL market price) if available, otherwise use initial price
    let livePriceUSD = poolPrice || initialPriceUSD;

    if (poolPrice) {
      console.log(
        `  💰 ${domainName}: POOL PRICE = $${poolPrice.toFixed(6)} (initial was $${initialPriceUSD.toFixed(6)})`
      );
    } else {
      console.log(
        `  💰 ${domainName}: Using initial price = $${initialPriceUSD.toFixed(6)} (no pool found)`
      );
    }

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
      totalSupply: totalSupply.toString(),
      decimals: decimals,
      symbol: token.params?.symbol || "",
      status: token.status || "active",
      metadata: token.metadata || null,
    });

    console.log(
      `✓ [${i + 1}/${tokens.length}] ${domainName} - Price: $${livePriceUSD.toFixed(2)}, Status: ${token.status || "active"}, Offers: ${activeOffersCount}`
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
  // 1. Age & Longevity Score (out of 100) - Weight: 15%
  // ========================================
  // More generous scoring: Even new domains can get decent scores
  const ageComponent = Math.min(domainData.yearsOnChain * 5 + 5, 50); // 5-50 points
  const expiryComponent = Math.min(domainData.yearsUntilExpiry * 10, 50); // 0-50 points
  const ageScore = (ageComponent + expiryComponent) / 10; // Scale to 0-10

  // ========================================
  // 2. Market Demand Score (out of 100) - Weight: 10%
  // ========================================
  // Base score of 50 for any listed domain, +10 per offer
  const baseDemandScore = 50; // Being listed/fractionalized is already valuable
  const offerBonus = Math.min(domainData.activeOffersCount * 10, 50);
  const demandScore = (baseDemandScore + offerBonus) / 10; // Scale to 0-10

  // ========================================
  // 3. Quality Score (out of 100) - Weight: 75%
  // ========================================
  // This is the most important factor for new domains
  const tldScore = calculateTldScore(domainData.tld); // 0-10
  const keywordScore = calculateKeywordScore(domainData.domainName); // 0-10
  const lengthScore = calculateLengthScore(domainData.nameLength); // 0-10

  // Weighted combination favoring quality indicators
  const qualityScore =
    tldScore * 0.4 + // TLD quality: 40% weight
    keywordScore * 0.35 + // Keyword value: 35% weight
    lengthScore * 0.25; // Length premium: 25% weight

  // ========================================
  // 4. Final DomaRank (out of 100)
  // ========================================
  // Rebalanced weights: Quality matters most for new domains
  const domaRank =
    ageScore * 1.5 + // Age: 15% weight (max 15 points)
    demandScore * 1.0 + // Demand: 10% weight (max 10 points)
    qualityScore * 7.5; // Quality: 75% weight (max 75 points)

  // ========================================
  // 5. Quality-Adjusted Valuation (Better Domains = Higher Valuation)
  // ========================================
  // Map DomaRank (0-100) to Quality Multiplier (0.5x - 1.2x)
  // Low quality (0-30): 0.5x-0.7x → Requires more collateral
  // Medium quality (30-70): 0.7x-1.0x → Moderate collateral
  // High quality (70-100): 1.0x-1.2x → Requires less collateral (trusted)

  let qualityMultiplier;
  if (domaRank <= 30) {
    // Low quality: 0.5x to 0.7x
    qualityMultiplier = 0.5 + (domaRank / 30) * 0.2;
  } else if (domaRank <= 70) {
    // Medium quality: 0.7x to 1.0x
    qualityMultiplier = 0.7 + ((domaRank - 30) / 40) * 0.3;
  } else {
    // High quality: 1.0x to 1.2x
    qualityMultiplier = 1.0 + ((domaRank - 70) / 30) * 0.2;
  }

  const finalValuationUSD = domainData.livePriceUSD * qualityMultiplier;

  // Log calculation breakdown
  console.log(`\n  📊 DomaRank Calculation for ${domainData.domainName}:`);
  console.log(`    Age & Longevity: ${ageScore.toFixed(2)}/10 (15% weight)`);
  console.log(`    Market Demand: ${demandScore.toFixed(2)}/10 (10% weight)`);
  console.log(
    `    Quality (TLD+Keywords+Length): ${qualityScore.toFixed(2)}/10 (75% weight)`
  );
  console.log(`    → DomaRank: ${domaRank.toFixed(2)}/100`);
  console.log(`    → Quality Multiplier: ${qualityMultiplier.toFixed(3)}x`);
  console.log(`    Live Market Price: $${domainData.livePriceUSD.toFixed(6)}`);
  console.log(`    AI Oracle Price: $${finalValuationUSD.toFixed(6)}`);
  console.log(
    `    Collateral Impact: ${qualityMultiplier > 1.0 ? "Less" : "More"} collateral required (${Math.abs((1 - qualityMultiplier) * 100).toFixed(1)}% ${qualityMultiplier > 1.0 ? "reduction" : "increase"})\n`
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
      qualityScore: parseFloat(qualityScore.toFixed(2)),
      tldScore: parseFloat(tldScore.toFixed(2)),
      keywordScore: parseFloat(keywordScore.toFixed(2)),
      lengthScore: parseFloat(lengthScore.toFixed(2)),
      qualityMultiplier: parseFloat(qualityMultiplier.toFixed(4)),
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
