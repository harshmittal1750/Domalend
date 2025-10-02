import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const RPC_URL = "https://rpc-testnet.doma.xyz";
const ORACLE_ADDRESS = process.env.DOMA_RANK_ORACLE_ADDRESS;
const PRIVATE_KEY = process.env.ORACLE_UPDATER_PRIVATE_KEY;

// Test token address (from the error logs)
const TEST_TOKEN_ADDRESS = "0xf547543382fe62c6da7bb862a0765b95e0269661";
const TEST_PRICE = "255303"; // Wei from the logs

console.log("🧪 Testing Direct Oracle Transaction");
console.log("=".repeat(60));
console.log(`Oracle Address: ${ORACLE_ADDRESS}`);
console.log(`Token Address: ${TEST_TOKEN_ADDRESS}`);
console.log(`Price: ${TEST_PRICE} Wei`);
console.log("=".repeat(60) + "\n");

async function testDirectTransaction() {
  try {
    // Create provider WITHOUT ENS
    const provider = new ethers.JsonRpcProvider(RPC_URL, {
      chainId: 97476,
      name: "doma-testnet",
      ensAddress: null, // Disable ENS
    });

    // Create wallet
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`Wallet Address: ${wallet.address}`);

    // Get balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Method 1: Manual function selector encoding
    console.log("📝 Method 1: Manual Encoding\n");

    // Function selector for updateTokenValue(address,uint256)
    // keccak256("updateTokenValue(address,uint256)") = 0x2cdb8eec...
    const functionSelector = "0x2cdb8eec";

    // Encode parameters manually
    // Parameter 1: address (padded to 32 bytes, no 0x prefix)
    const addressParam = TEST_TOKEN_ADDRESS.slice(2)
      .toLowerCase()
      .padStart(64, "0");

    // Parameter 2: uint256 (padded to 32 bytes)
    const priceParam = BigInt(TEST_PRICE).toString(16).padStart(64, "0");

    // Combine: selector + params
    const calldata = functionSelector + addressParam + priceParam;

    console.log(`Function Selector: ${functionSelector}`);
    console.log(`Address Param: 0x${addressParam}`);
    console.log(`Price Param: 0x${priceParam}`);
    console.log(`Full Calldata: ${calldata}\n`);

    // Get nonce
    const nonce = await provider.getTransactionCount(wallet.address);
    console.log(`Nonce: ${nonce}`);

    // Get gas price
    const feeData = await provider.getFeeData();
    console.log(
      `Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`
    );

    // Estimate gas using raw RPC call to bypass ethers.js address processing
    console.log("\n🔍 Estimating gas...");
    let gasEstimate;
    try {
      const gasHex = await provider.send("eth_estimateGas", [
        {
          from: wallet.address,
          to: ORACLE_ADDRESS,
          data: calldata,
        },
      ]);
      gasEstimate = BigInt(gasHex);
      console.log(`Gas Estimate: ${gasEstimate.toString()}`);
    } catch (error) {
      console.log(`⚠️ Could not estimate gas: ${error.message}`);
      console.log(`Using fixed gas limit: 100000`);
      gasEstimate = 100000n;
    }

    // Build transaction manually
    const tx = {
      to: ORACLE_ADDRESS,
      data: calldata,
      nonce: nonce,
      gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      gasPrice: feeData.gasPrice,
      chainId: 97476,
    };

    console.log("\n📤 Sending transaction...");
    console.log(
      JSON.stringify(
        tx,
        (key, value) => (typeof value === "bigint" ? value.toString() : value),
        2
      )
    );

    // Send transaction
    const sentTx = await wallet.sendTransaction(tx);
    console.log(`\n✓ Transaction sent: ${sentTx.hash}`);
    console.log(
      `   Explorer: https://explorer-testnet.doma.xyz/tx/${sentTx.hash}`
    );

    console.log("\n⏳ Waiting for confirmation...");
    const receipt = await sentTx.wait();

    console.log(`\n✅ Transaction confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Status: ${receipt.status === 1 ? "Success" : "Failed"}`);

    // Verify the price was updated
    console.log("\n🔍 Verifying price update...");

    // Read the price using manual encoding and raw RPC call
    const getValueSelector = "0xf1c5d6c2"; // keccak256("getTokenValue(address)")
    const readCalldata = getValueSelector + addressParam;

    const result = await provider.send("eth_call", [
      {
        to: ORACLE_ADDRESS,
        data: readCalldata,
      },
      "latest",
    ]);

    const storedPrice = BigInt(result);
    console.log(`   Stored Price: ${storedPrice.toString()} Wei`);
    console.log(`   Expected: ${TEST_PRICE} Wei`);
    console.log(
      `   Match: ${storedPrice.toString() === TEST_PRICE ? "✅ YES" : "❌ NO"}`
    );
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    if (error.data) {
      console.error(`   Data: ${error.data}`);
    }
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run test
testDirectTransaction()
  .then(() => {
    console.log("\n" + "=".repeat(60));
    console.log("✅ Test completed successfully!");
    console.log("=".repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  });
