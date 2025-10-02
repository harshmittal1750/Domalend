# 🚀 Quick Start Guide

Get the DomaRank Oracle service up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Deployed DomaRankOracle.sol contract
- Wallet with owner access to the oracle
- Native tokens for gas fees (0.1 ETH recommended)
- Doma Subgraph API endpoint

## Step 1: Install

```bash
cd backend
npm install
```

## Step 2: Configure

Create your configuration file:

```bash
cp config.example.js config.js
```

Edit `config.js`:

```javascript
export const config = {
  // REQUIRED: Doma Subgraph endpoint (Doma Testnet)
  domaSubgraphUrl: "https://api-testnet.doma.xyz/graphql",

  // REQUIRED: Blockchain RPC (Doma Testnet - Chain ID: 97476)
  rpcUrl: "https://rpc-testnet.doma.xyz",

  // REQUIRED: Your deployed DomaRankOracle address
  domaRankOracleAddress: "0xYOUR_ORACLE_ADDRESS_HERE",

  // REQUIRED: Private key with owner access (keep secure!)
  oracleUpdaterPrivateKey: "0xYOUR_PRIVATE_KEY_HERE",

  // OPTIONAL: Scheduling (defaults shown)
  updateIntervalMs: 300000, // 5 minutes
  maxTokensPerRun: 50, // Process 50 tokens per cycle
  delayBetweenUpdates: 2000, // 2 seconds between tx
  minPriceChangePercent: 1, // Only update if >1% change
};
```

## Step 3: Test Components

Test each component individually:

```bash
# Test subgraph connection
npm run test-subgraph

# Test pricing engine
npm run test-pricing

# Test oracle connection
npm run test-oracle
```

Expected output:

```
✓ Subgraph URL configured
✓ Oracle connection initialized
✓ Wallet balance: 0.5 ETH
Is owner: true
```

## Step 4: Run Test Cycle

Run a single update cycle to verify everything works:

```bash
npm run start:once
```

This will:

1. Fetch tokens from subgraph
2. Calculate valuations
3. Update oracle prices
4. Exit

Watch for:

- ✓ Successful transaction confirmations
- Gas costs (should be reasonable)
- No errors in the logs

## Step 5: Start Production Service

Once testing is successful, start the scheduled service:

```bash
# Simple start
npm start

# Or with PM2 (recommended)
npm install -g pm2
pm2 start npm --name "doma-oracle" -- start
pm2 save
```

## What Happens Next?

The service will:

- ✅ Run every 5 minutes automatically
- ✅ Fetch all fractional tokens from Doma
- ✅ Calculate AI-powered valuations
- ✅ Update on-chain prices (only if changed >1%)
- ✅ Log all activities
- ✅ Handle errors gracefully

## Monitoring

View logs in real-time:

```bash
# If using PM2
pm2 logs doma-oracle

# If using npm start
# Logs appear in terminal
```

Stop the service:

```bash
# If using PM2
pm2 stop doma-oracle

# If using npm start
# Press Ctrl+C
```

## Common Issues

### "Oracle updater private key not configured"

**Solution:** Set `ORACLE_UPDATER_PRIVATE_KEY` in config.js

### "Wallet is not the owner of the oracle contract"

**Solutions:**

1. Transfer oracle ownership to your wallet address
2. Or use the correct wallet that owns the oracle

### "No tokens found in subgraph"

**Solutions:**

1. Verify `DOMA_SUBGRAPH_URL` is correct
2. Check if Doma has any fractional tokens deployed
3. Test with `npm run test-subgraph`

### "Insufficient funds for gas"

**Solution:** Send native tokens to your updater wallet address

## Next Steps

- Set up monitoring and alerts
- Configure production deployment (PM2/Docker/systemd)
- Adjust update frequency based on needs
- Implement multi-sig for oracle ownership
- Set up backup instances for redundancy

## Network Information

**Doma Testnet:**

- Chain ID: 97476
- RPC: https://rpc-testnet.doma.xyz
- Explorer: https://explorer-testnet.doma.xyz
- Subgraph: https://api-testnet.doma.xyz/graphql
- Bridge: https://bridge-testnet.doma.xyz

**Key Contracts:**

- Ownership Token: `0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f`
- Doma Record: `0xF6A92E0f8bEa4174297B0219d9d47fEe335f84f8`

See [NETWORK_CONFIG.md](./NETWORK_CONFIG.md) for complete details.

## Getting Help

Check the main README.md for:

- Detailed architecture documentation
- Security best practices
- Troubleshooting guide
- API reference

## Success Checklist

- [x] All components tested individually
- [x] Single update cycle completed successfully
- [x] Service running with scheduled updates
- [x] Transactions confirmed on-chain
- [x] Monitoring set up
- [x] Wallet funded for ongoing operations

**Congratulations! Your DomaRank Oracle is now live!** 🎉
