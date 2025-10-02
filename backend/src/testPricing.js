/**
 * @fileoverview Test script for the complete pricing pipeline
 * @description Demonstrates data collection and valuation calculation
 */

import { fetchDomainDataByToken } from "./dataCollector.js";
import { calculateDomaValue } from "./pricingEngine.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Tests the complete pricing pipeline for a single token
 * @param {string} tokenAddress - Token address to test
 */
async function testSingleToken(tokenAddress) {
  console.log("=".repeat(60));
  console.log("TESTING PRICING PIPELINE FOR SINGLE TOKEN");
  console.log("=".repeat(60));
  console.log(`Token Address: ${tokenAddress}\n`);

  try {
    // Step 1: Collect data from subgraph
    console.log("📊 Step 1: Collecting data from Doma Subgraph...");
    const domainData = await fetchDomainDataByToken(tokenAddress);
    console.log("✓ Data collected successfully\n");

    console.log("Domain Information:");
    console.log(`  - Name: ${domainData.domainName}`);
    console.log(`  - TLD: ${domainData.tld}`);
    console.log(`  - Length: ${domainData.nameLength} characters`);
    console.log(`  - Market Cap: ${domainData.marketCap}`);
    console.log(`  - Total Sales: ${domainData.metadata.totalSales}\n`);

    // Step 2: Calculate valuation
    console.log("🧠 Step 2: Calculating AI-powered valuation...");
    const valuation = calculateDomaValue(domainData);
    console.log("✓ Valuation calculated successfully\n");

    // Step 3: Display results
    console.log("=".repeat(60));
    console.log("VALUATION RESULTS");
    console.log("=".repeat(60));

    console.log("\n💰 FINAL PRICE (for oracle):");
    console.log(`  ${valuation.priceUSD18Decimals} Wei (18 decimals)`);

    console.log("\n📈 HUMAN-READABLE:");
    console.log(`  Price per Token: ${valuation.humanReadable.priceInETH} ETH`);
    console.log(`  Price per Token: ${valuation.humanReadable.priceInUSD}`);
    console.log(
      `  Total Valuation: ${valuation.humanReadable.totalValuationInETH} ETH`
    );
    console.log(`  Quality Rating: ${valuation.humanReadable.qualityRating}`);

    console.log("\n🔍 SCORING BREAKDOWN:");
    console.log(
      `  Overall Domain Score: ${valuation.breakdown.domainScore}/100`
    );
    console.log(`    - Length Score: ${valuation.breakdown.lengthScore}/100`);
    console.log(`    - TLD Score: ${valuation.breakdown.tldScore}/100`);
    console.log(`    - Sales Score: ${valuation.breakdown.salesScore}/100`);

    console.log("\n⚙️ VALUATION MECHANICS:");
    console.log(`  Base Value: ${valuation.breakdown.baseValue} Wei`);
    console.log(
      `  Quality Multiplier: ${valuation.breakdown.qualityMultiplier}x`
    );
    console.log(`  Risk Adjustment: ${valuation.breakdown.riskAdjustment}x`);
    console.log(`  Total Supply: ${valuation.breakdown.totalSupply} tokens`);

    console.log("\n" + "=".repeat(60));
    console.log("✓ Pipeline test completed successfully!");
    console.log("=".repeat(60) + "\n");

    return valuation;
  } catch (error) {
    console.error("❌ Error in pipeline:", error.message);
    throw error;
  }
}

/**
 * Tests the pricing pipeline with mock data (for testing without subgraph)
 */
function testWithMockData() {
  console.log("=".repeat(60));
  console.log("TESTING WITH MOCK DATA");
  console.log("=".repeat(60) + "\n");

  const mockDomainData = {
    tokenAddress: "0x1234567890123456789012345678901234567890",
    domainName: "cool.xyz",
    tld: "xyz",
    nameLength: 4,
    salesHistory: [
      {
        id: "1",
        price: "500000000000000000", // 0.5 ETH
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days ago
        date: new Date(Date.now() - 86400 * 30 * 1000).toISOString(),
        buyer: "0xbuyer1",
        seller: "0xseller1",
      },
      {
        id: "2",
        price: "750000000000000000", // 0.75 ETH
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 60, // 60 days ago
        date: new Date(Date.now() - 86400 * 60 * 1000).toISOString(),
        buyer: "0xbuyer2",
        seller: "0xseller2",
      },
    ],
    marketCap: "10000000000000000000", // 10 ETH
    fractionalToken: {
      address: "0x1234567890123456789012345678901234567890",
      totalSupply: "1000",
      currentPrice: "10000000000000000", // 0.01 ETH
    },
    metadata: {
      totalSales: 2,
      lastSalePrice: "500000000000000000",
    },
  };

  console.log("Mock Domain Information:");
  console.log(`  - Name: ${mockDomainData.domainName}`);
  console.log(`  - TLD: ${mockDomainData.tld}`);
  console.log(`  - Length: ${mockDomainData.nameLength} characters`);
  console.log(`  - Market Cap: ${mockDomainData.marketCap} Wei`);
  console.log(`  - Total Sales: ${mockDomainData.metadata.totalSales}\n`);

  const valuation = calculateDomaValue(mockDomainData);

  console.log("=".repeat(60));
  console.log("VALUATION RESULTS");
  console.log("=".repeat(60));

  console.log("\n💰 FINAL PRICE:");
  console.log(`  ${valuation.priceUSD18Decimals} Wei`);
  console.log(`  ${valuation.humanReadable.priceInETH} ETH per token`);

  console.log("\n📊 SCORES:");
  console.log(`  Domain Score: ${valuation.breakdown.domainScore}/100`);
  console.log(`  Quality Rating: ${valuation.humanReadable.qualityRating}`);

  console.log("\n" + "=".repeat(60));
  console.log("✓ Mock data test completed!");
  console.log("=".repeat(60) + "\n");

  return valuation;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const testMode = args[0] || "mock";

  if (testMode === "mock") {
    // Test with mock data
    testWithMockData();
  } else if (testMode === "live") {
    // Test with live data
    const tokenAddress =
      args[1] ||
      process.env.TEST_TOKEN_ADDRESS ||
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
    await testSingleToken(tokenAddress);
  } else {
    console.log("Usage:");
    console.log("  npm run test-pricing              (mock data test)");
    console.log("  npm run test-pricing live [address]  (live subgraph test)");
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { testSingleToken, testWithMockData };
