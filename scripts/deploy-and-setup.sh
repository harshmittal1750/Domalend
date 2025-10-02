#!/bin/bash

# Deploy and Setup Mock Tokens for DreamLend Testing
# Usage: ./scripts/deploy-and-setup.sh

set -e

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

echo "🚀 Starting DreamLend Mock Token Deployment..."

# Check if required environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable is not set"
    echo "Please add it to your .env file or set it with: export PRIVATE_KEY=0x..."
    exit 1
fi

# Use environment variables with defaults
RPC_URL="${SOMNIA_RPC_URL:-https://dream-rpc.somnia.network}"
VERIFY_FLAG=""

if [ "$VERIFY_CONTRACTS" = "true" ]; then
    VERIFY_FLAG="--verify"
    echo "🔍 Contract verification enabled"
fi

echo "📍 Using RPC: $RPC_URL"
echo "👤 Deployer: $(cast wallet address $PRIVATE_KEY)"

# Step 1: Deploy mock tokens
echo ""
echo "📦 Step 1: Deploying mock tokens..."
cd contracts

DEPLOY_OUTPUT=$(forge script script/DeployMockTokens.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    $VERIFY_FLAG \
    2>&1)

echo "$DEPLOY_OUTPUT"

# Extract addresses from deployment output
MUSDT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "MockUSDT deployed to:" | awk '{print $4}')
MUSDC_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "MockUSDC deployed to:" | awk '{print $4}')
MWBTC_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "MockWBTC deployed to:" | awk '{print $4}')
MARB_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "MockARB deployed to:" | awk '{print $4}')
MSOL_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "MockSOL deployed to:" | awk '{print $4}')

cd ..

echo ""
echo "📋 Deployed Addresses:"
echo "MUSDT: $MUSDT_ADDRESS"
echo "MUSDC: $MUSDC_ADDRESS"
echo "MWBTC: $MWBTC_ADDRESS"
echo "MARB: $MARB_ADDRESS"
echo "MSOL: $MSOL_ADDRESS"

# Step 2: Update configuration files
echo ""
echo "⚙️  Step 2: Updating configuration files..."

node scripts/update-token-addresses.js \
    --musdt=$MUSDT_ADDRESS \
    --musdc=$MUSDC_ADDRESS \
    --mwbtc=$MWBTC_ADDRESS \
    --marb=$MARB_ADDRESS \
    --msol=$MSOL_ADDRESS

# Step 3: Redeploy DreamLend contract
echo ""
echo "🏗️  Step 3: Redeploying DreamLend contract with updated configuration..."
cd contracts

DREAMLEND_OUTPUT=$(forge script script/Deploy.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    $VERIFY_FLAG \
    2>&1)

echo "$DREAMLEND_OUTPUT"

DREAMLEND_ADDRESS=$(echo "$DREAMLEND_OUTPUT" | grep "DreamLend deployed to:" | awk '{print $4}')

cd ..

# Step 4: Mint test tokens
echo ""
echo "🪙 Step 4: Minting test tokens..."
cd contracts

forge script script/MintTestTokens.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast

cd ..

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Contract Addresses:"
echo "DreamLend: $DREAMLEND_ADDRESS"
echo "MockUSDT:  $MUSDT_ADDRESS"
echo "MockUSDC:  $MUSDC_ADDRESS"
echo "MockWBTC:  $MWBTC_ADDRESS"
echo "MockARB:   $MARB_ADDRESS"
echo "MockSOL:   $MSOL_ADDRESS"
echo ""
echo "🔗 Add these to your wallet:"
echo "Network: Somnia L1 Testnet"
echo "RPC URL: $RPC_URL"
echo "Chain ID: 50312"
echo ""
echo "💡 Next steps:"
echo "1. Add the token addresses to your wallet"
echo "2. Test the frontend at http://localhost:3000"
echo "3. Create loan offers and test the lending flow"
echo ""
echo "📚 For more details, see contracts/MOCK_TOKENS_README.md"

