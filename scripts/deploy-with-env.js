#!/usr/bin/env node

/**
 * Deploy Mock Tokens using environment variables from .env file
 * Usage: node scripts/deploy-with-env.js
 */

require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, cwd = process.cwd()) {
  try {
    const result = execSync(command, {
      cwd,
      stdio: "pipe",
      encoding: "utf8",
      env: { ...process.env },
    });
    return result;
  } catch (error) {
    log(`❌ Command failed: ${command}`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    if (error.stdout) log(`Stdout: ${error.stdout}`, colors.yellow);
    if (error.stderr) log(`Stderr: ${error.stderr}`, colors.red);
    process.exit(1);
  }
}

function main() {
  log("🚀 Starting DreamLend Mock Token Deployment...", colors.cyan);

  // Check required environment variables
  const requiredVars = ["PRIVATE_KEY"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    log("❌ Missing required environment variables:", colors.red);
    missingVars.forEach((varName) => {
      log(`  - ${varName}`, colors.red);
    });
    log("\nPlease add these to your .env file:", colors.yellow);
    log("PRIVATE_KEY=your_private_key_here", colors.yellow);
    process.exit(1);
  }

  // Set default values
  const RPC_URL =
    process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const VERIFY = process.env.VERIFY_CONTRACTS === "true";

  log(`📍 Using RPC: ${RPC_URL}`, colors.blue);

  // Get deployer address
  try {
    const deployerAddress = execCommand(
      `cast wallet address ${PRIVATE_KEY}`
    ).trim();
    log(`👤 Deployer: ${deployerAddress}`, colors.blue);
  } catch (error) {
    log("❌ Invalid private key or cast not installed", colors.red);
    process.exit(1);
  }

  const contractsDir = path.join(__dirname, "../contracts");

  // Step 1: Deploy mock tokens
  log("\n📦 Step 1: Deploying mock tokens...", colors.magenta);

  const deployCommand = [
    "forge script script/DeployMockTokens.s.sol",
    `--rpc-url ${RPC_URL}`,
    `--private-key ${PRIVATE_KEY}`,
    "--broadcast",
  ];

  if (VERIFY) {
    deployCommand.push("--verify");
  }

  const deployOutput = execCommand(deployCommand.join(" "), contractsDir);
  log(deployOutput, colors.green);

  // Extract addresses from deployment output
  const extractAddress = (output, tokenName) => {
    const regex = new RegExp(`${tokenName} deployed to: (0x[a-fA-F0-9]{40})`);
    const match = output.match(regex);
    return match ? match[1] : null;
  };

  const addresses = {
    MUSDT: extractAddress(deployOutput, "MockUSDT"),
    MUSDC: extractAddress(deployOutput, "MockUSDC"),
    MWBTC: extractAddress(deployOutput, "MockWBTC"),
    MARB: extractAddress(deployOutput, "MockARB"),
    MSOL: extractAddress(deployOutput, "MockSOL"),
  };

  log("\n📋 Deployed Addresses:", colors.cyan);
  Object.entries(addresses).forEach(([token, address]) => {
    if (address) {
      log(`${token}: ${address}`, colors.green);
    } else {
      log(`${token}: ❌ Failed to extract address`, colors.red);
    }
  });

  // Check if all addresses were extracted successfully
  const missingAddresses = Object.entries(addresses).filter(
    ([, addr]) => !addr
  );
  if (missingAddresses.length > 0) {
    log(
      "\n❌ Failed to extract some addresses. Please check the deployment output above.",
      colors.red
    );
    process.exit(1);
  }

  // Step 2: Update configuration files
  log("\n⚙️  Step 2: Updating configuration files...", colors.magenta);

  const updateCommand = [
    "node scripts/update-token-addresses.js",
    `--musdt=${addresses.MUSDT}`,
    `--musdc=${addresses.MUSDC}`,
    `--mwbtc=${addresses.MWBTC}`,
    `--marb=${addresses.MARB}`,
    `--msol=${addresses.MSOL}`,
  ];

  const updateOutput = execCommand(updateCommand.join(" "));
  log(updateOutput, colors.green);

  // Step 3: Redeploy DreamLend contract
  log("\n🏗️  Step 3: Redeploying DreamLend contract...", colors.magenta);

  const dreamlendCommand = [
    "forge script script/Deploy.s.sol",
    `--rpc-url ${RPC_URL}`,
    `--private-key ${PRIVATE_KEY}`,
    "--broadcast",
  ];

  if (VERIFY) {
    dreamlendCommand.push("--verify");
  }

  const dreamlendOutput = execCommand(dreamlendCommand.join(" "), contractsDir);
  log(dreamlendOutput, colors.green);

  const dreamlendAddress = extractAddress(dreamlendOutput, "DreamLend");

  // Step 4: Mint test tokens
  log("\n🪙 Step 4: Minting test tokens...", colors.magenta);

  const mintCommand = [
    "forge script script/MintTestTokens.s.sol",
    `--rpc-url ${RPC_URL}`,
    `--private-key ${PRIVATE_KEY}`,
    "--broadcast",
  ];

  const mintOutput = execCommand(mintCommand.join(" "), contractsDir);
  log(mintOutput, colors.green);

  // Final summary
  log("\n🎉 Deployment completed successfully!", colors.green);
  log("\n📋 Contract Addresses:", colors.cyan);
  log(`DreamLend: ${dreamlendAddress || "❌ Failed to extract"}`, colors.green);
  Object.entries(addresses).forEach(([token, address]) => {
    log(`${token}: ${address}`, colors.green);
  });

  log("\n🔗 Add these to your wallet:", colors.yellow);
  log("Network: Somnia L1 Testnet", colors.yellow);
  log(`RPC URL: ${RPC_URL}`, colors.yellow);
  log("Chain ID: 50312", colors.yellow);

  log("\n💡 Next steps:", colors.cyan);
  log("1. Add the token addresses to your wallet", colors.cyan);
  log("2. Test the frontend at http://localhost:3000", colors.cyan);
  log("3. Create loan offers and test the lending flow", colors.cyan);

  log(
    "\n📚 For more details, see contracts/MOCK_TOKENS_README.md",
    colors.blue
  );
}

// Check if dotenv is installed
try {
  require.resolve("dotenv");
} catch (e) {
  log("❌ dotenv package not found. Installing...", colors.yellow);
  try {
    execSync("npm install dotenv", { stdio: "inherit" });
    log("✅ dotenv installed successfully", colors.green);
  } catch (error) {
    log(
      "❌ Failed to install dotenv. Please run: npm install dotenv",
      colors.red
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
