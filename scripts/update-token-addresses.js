#!/usr/bin/env node

/**
 * Script to update token addresses in configuration files after deployment
 *
 * Usage:
 * node scripts/update-token-addresses.js \
 *   --musdt=0x... \
 *   --musdc=0x... \
 *   --mwbtc=0x... \
 *   --marb=0x... \
 *   --msol=0x...
 */

const fs = require("fs");
const path = require("path");

// Parse command line arguments
const args = process.argv.slice(2);
const addresses = {};

args.forEach((arg) => {
  if (arg.startsWith("--")) {
    const [key, value] = arg.substring(2).split("=");
    if (value && value.startsWith("0x")) {
      addresses[key.toUpperCase()] = value;
    }
  }
});

console.log("🔄 Updating token addresses...");
console.log("Addresses to update:", addresses);

// Update TypeScript config file
function updateTypeScriptConfig() {
  const configPath = path.join(__dirname, "../src/config/tokens.ts");
  let content = fs.readFileSync(configPath, "utf8");

  // Update each token address
  Object.entries(addresses).forEach(([token, address]) => {
    const regex = new RegExp(
      `(${token}:\\s*{[\\s\\S]*?address:\\s*)"0x0{40}"`,
      "g"
    );
    content = content.replace(regex, `$1"${address}"`);
    console.log(`✅ Updated ${token} address in tokens.ts`);
  });

  fs.writeFileSync(configPath, content);
}

// Update Solidity config file
function updateSolidityConfig() {
  const configPath = path.join(__dirname, "../contracts/src/SomniaConfig.sol");
  let content = fs.readFileSync(configPath, "utf8");

  // Mapping from frontend names to Solidity constant names
  const solidityMapping = {
    MUSDT: "USDT_TOKEN",
    MUSDC: "USDC_TOKEN",
    MWBTC: "BTC_TOKEN",
    MARB: "ARB_TOKEN",
    MSOL: "SOL_TOKEN",
  };

  Object.entries(addresses).forEach(([token, address]) => {
    const solidityName = solidityMapping[token];
    if (solidityName) {
      // Update the constant declaration
      const regex = new RegExp(
        `(address public constant ${solidityName} =\\s*)(address\\(0x[0-9a-fA-F]*\\)|address\\(0\\))`,
        "g"
      );
      content = content.replace(regex, `$1address(${address})`);
      console.log(`✅ Updated ${solidityName} address in SomniaConfig.sol`);
    }
  });

  fs.writeFileSync(configPath, content);
}

// Update MintTestTokens script
function updateMintScript() {
  const scriptPath = path.join(
    __dirname,
    "../contracts/script/MintTestTokens.s.sol"
  );
  let content = fs.readFileSync(scriptPath, "utf8");

  const scriptMapping = {
    MUSDT: "MOCK_USDT",
    MUSDC: "MOCK_USDC",
    MWBTC: "MOCK_WBTC",
    MARB: "MOCK_ARB",
    MSOL: "MOCK_SOL",
  };

  Object.entries(addresses).forEach(([token, address]) => {
    const constantName = scriptMapping[token];
    if (constantName) {
      const regex = new RegExp(
        `(address public constant ${constantName} = )address\\(0\\)`,
        "g"
      );
      content = content.replace(regex, `$1${address}`);
      console.log(`✅ Updated ${constantName} address in MintTestTokens.s.sol`);
    }
  });

  fs.writeFileSync(scriptPath, content);
}

// Main execution
try {
  if (Object.keys(addresses).length === 0) {
    console.log("❌ No valid addresses provided. Usage:");
    console.log(
      "node scripts/update-token-addresses.js --musdt=0x... --musdc=0x... --mwbtc=0x... --marb=0x... --msol=0x..."
    );
    process.exit(1);
  }

  updateTypeScriptConfig();
  updateSolidityConfig();
  updateMintScript();

  console.log("\n🎉 All token addresses updated successfully!");
  console.log("\n📋 Next steps:");
  console.log(
    "1. Redeploy DreamLend contract: forge script script/Deploy.s.sol --broadcast"
  );
  console.log(
    "2. Mint test tokens: forge script script/MintTestTokens.s.sol --broadcast"
  );
  console.log("3. Test the frontend with the new token addresses");
} catch (error) {
  console.error("❌ Error updating addresses:", error.message);
  process.exit(1);
}

