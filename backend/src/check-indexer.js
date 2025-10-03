#!/usr/bin/env node

/**
 * Check Indexer Status and Debug
 *
 * This script checks if the indexer is running and catching events properly
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const INDEXER_URL = "http://localhost:3001";
const RPC_URL = process.env.RPC_URL || "https://rpc-testnet.doma.xyz";
const CONTRACT_ADDRESS = "0x9F1694E8a8aC038d4ab3e2217AC0E79111948FD9";

async function checkIndexerStatus() {
  console.log("\n🔍 CHECKING INDEXER STATUS\n");
  console.log("=".repeat(60));

  // 1. Check if indexer is running
  console.log("\n1️⃣ Checking if indexer is running...");
  try {
    const response = await fetch(`${INDEXER_URL}/health`);
    if (response.ok) {
      const health = await response.json();
      console.log("   ✅ Indexer is running!");
      console.log(`   📊 Status:`, JSON.stringify(health.indexer, null, 4));
    } else {
      console.log("   ❌ Indexer health check failed!");
      console.log("   Please start the indexer: npm run indexer");
      return;
    }
  } catch (error) {
    console.log("   ❌ Cannot connect to indexer!");
    console.log("   Error:", error.message);
    console.log("\n   💡 To start the indexer:");
    console.log("      cd backend");
    console.log("      npm run indexer\n");
    return;
  }

  // 2. Check contract address configuration
  console.log("\n2️⃣ Checking contract address configuration...");
  if (
    !CONTRACT_ADDRESS ||
    CONTRACT_ADDRESS === "YOUR_DEPLOYED_CONTRACT_ADDRESS"
  ) {
    console.log("   ❌ DreamLend contract address not set!");
    console.log("   Please set DREAM_LEND_CONTRACT_ADDRESS in backend/.env");
    return;
  }
  console.log(`   ✅ Contract address: ${CONTRACT_ADDRESS}`);

  // 3. Check if contract exists on chain
  console.log("\n3️⃣ Checking if contract exists on chain...");
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      console.log("   ❌ No contract found at this address!");
      console.log("   Make sure you've deployed DreamLend to Doma testnet");
      return;
    }
    console.log("   ✅ Contract found on chain");
  } catch (error) {
    console.log("   ❌ Error checking contract:", error.message);
    return;
  }

  // 4. Check indexed loans
  console.log("\n4️⃣ Checking indexed loans...");
  try {
    const response = await fetch(`${INDEXER_URL}/api/loans/created`);
    const data = await response.json();
    const loans = data.loanCreateds || [];

    console.log(`   📄 Total loans indexed: ${loans.length}`);

    if (loans.length === 0) {
      console.log("\n   ⚠️  No loans indexed yet!");
      console.log("   Possible reasons:");
      console.log("      - No loans have been created yet");
      console.log(
        "      - Indexer started after loans were created (check INDEXER_START_BLOCK)"
      );
      console.log("      - Contract address is incorrect");
    } else {
      console.log("\n   ✅ Recent loans:");
      loans.slice(0, 3).forEach((loan, i) => {
        console.log(`   ${i + 1}. Loan ID: ${loan.loanId}`);
        console.log(`      Lender: ${loan.lender}`);
        console.log(`      Amount: ${ethers.formatUnits(loan.amount, 6)}`);
        console.log(`      Block: ${loan.blockNumber}`);
        console.log(
          `      Timestamp: ${new Date(parseInt(loan.blockTimestamp) * 1000).toLocaleString()}`
        );
        console.log("");
      });
    }
  } catch (error) {
    console.log("   ❌ Error fetching loans:", error.message);
  }

  // 5. Check protocol stats
  console.log("\n5️⃣ Checking protocol stats...");
  try {
    const response = await fetch(`${INDEXER_URL}/api/stats`);
    const data = await response.json();
    const stats = data.protocolStats_collection?.[0];

    if (stats) {
      console.log("   📊 Protocol Statistics:");
      console.log(`      Total Loans Created: ${stats.totalLoansCreated}`);
      console.log(
        `      Total Volume: ${ethers.formatUnits(stats.totalLoanVolume, 18)} tokens`
      );
      console.log(`      Last Processed Block: ${stats.lastProcessedBlock}`);
    }
  } catch (error) {
    console.log("   ❌ Error fetching stats:", error.message);
  }

  // 6. Check frontend configuration
  console.log("\n6️⃣ Checking frontend configuration...");
  console.log("   Current SUBGRAPH_URL should point to:");
  console.log(`   http://localhost:3001/graphql`);
  console.log("\n   Set in frontend .env.local:");
  console.log(`   NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:3001/graphql`);

  console.log("\n" + "=".repeat(60));
  console.log("\n✅ DIAGNOSTIC COMPLETE\n");

  console.log("📝 Next Steps:");
  console.log(
    "   1. Make sure indexer is running: cd backend && npm run indexer"
  );
  console.log("   2. Update frontend .env.local with NEXT_PUBLIC_SUBGRAPH_URL");
  console.log("   3. Restart frontend: npm run dev");
  console.log("   4. Create a test loan to verify indexing");
  console.log("");
}

// Run
checkIndexerStatus().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { checkIndexerStatus };
