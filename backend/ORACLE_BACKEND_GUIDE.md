# DomaLend Oracle Backend - Complete System Guide

## 📋 Overview

The **oracle-backend.js** file is a complete, production-ready backend system that integrates three critical components:

1. **The Collector** 🔍 - Fetches domain data from Doma's Subgraph
2. **The Brain** 🧠 - Calculates risk-adjusted valuations using AI scoring
3. **The Messenger** ⛓️ - Broadcasts prices to the blockchain

This system runs autonomously, updating fractional domain token prices on-chain every 10 minutes.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  ORACLE BACKEND SYSTEM                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ├─── PART 1: THE COLLECTOR
                            │    • Query Doma Subgraph
                            │    • Fetch all fractional tokens
                            │    • Get domain metadata
                            │    • Calculate time-based metrics
                            │
                            ├─── PART 2: THE BRAIN
                            │    • Age & Longevity Score (20% weight)
                            │    • Market Demand Score (50% weight)
                            │    • Keyword & TLD Score (30% weight)
                            │    • Calculate DomaRank (0-100)
                            │    • Generate risk-adjusted valuation
                            │
                            └─── PART 3: THE MESSENGER
                                 • Connect to blockchain via ethers.js
                                 • Check existing on-chain prices
                                 • Skip insignificant changes (<1%)
                                 • Send updateTokenValue transactions
                                 • Wait for confirmations
```

## 🎯 Key Features

### 1. Comprehensive Data Collection

- Queries Doma's Subgraph GraphQL API
- Fetches up to 100 fractional tokens per cycle
- Retrieves domain metadata (name, TLD, length, dates)
- Calculates time-based metrics (age, expiry)
- Tracks sales history and active offers

### 2. Intelligent Scoring Algorithm

#### DomaRank Formula

```
DomaRank = (Age Score × 2) + (Demand Score × 5) + (Keyword Score × 3)
```

**Age & Longevity Score (0-10)**

- Years on-chain component: `min(yearsOnChain × 2, 5)`
- Years until expiry component: `min(yearsUntilExpiry × 1, 5)`
- Total: Sum of both components (capped at 10)

**Market Demand Score (0-10)**

- Based on active offers count
- Formula: `min(activeOffersCount × 2, 10)`

**Keyword & TLD Score (0-10)**

- TLD Score: Premium TLDs (.com, .io, .ai) get higher scores
- Keyword Score: Domains with crypto keywords (defi, nft, web3) scored higher
- Length Score: Shorter domains (1-5 chars) get maximum score
- Combined: `(TLD × 0.5) + (Keyword × 0.3) + (Length × 0.2)`

#### Risk-Adjusted Valuation

```
Final USD Valuation = Live Price × (DomaRank / 100)
```

This means a domain with DomaRank 80 will have its price adjusted to 80% of the live market price, while a domain with DomaRank 100 keeps 100% of its value.

### 3. Smart On-Chain Broadcasting

- **Gas Optimization**: Only updates prices with >1% change
- **Rate Limiting**: 2-second delay between transactions
- **Error Handling**: Continues on errors, logs all failures
- **Balance Checking**: Verifies sufficient ETH for gas
- **Transaction Tracking**: Full logging with block confirmations

## 🚀 Getting Started

### Prerequisites

1. **Node.js** v18+ with ESM support
2. **Doma Testnet Access** (RPC and Subgraph)
3. **Deployed DomaRankOracle Contract**
4. **Funded Wallet** (for gas fees)

### Installation

```bash
cd backend
npm install
```

### Configuration

Create a `.env` file:

```env
# Doma Subgraph
DOMA_SUBGRAPH_URL=https://api-testnet.doma.xyz/graphql

# Doma API Key (REQUIRED - get from Doma team or dashboard)
DOMA_API_KEY=your_api_key_here

# Blockchain (Doma Testnet)
RPC_URL=https://rpc-testnet.doma.xyz

# Your deployed oracle contract
DOMA_RANK_ORACLE_ADDRESS=0xYourOracleAddressHere

# Private key with owner permissions
ORACLE_UPDATER_PRIVATE_KEY=0xYourPrivateKeyHere
```

**Important:** The Doma Subgraph API requires authentication. You must obtain an API key from the Doma team to query fractional token data.

### Running the System

**Start the backend** (runs indefinitely, updating every 10 minutes):

```bash
npm run backend
```

**Development mode** (auto-restarts on file changes):

```bash
npm run backend:dev
```

## 📊 Scoring Examples

### Example 1: Premium Short Domain

**Domain**: `nft.com`

```javascript
{
  nameLength: 3,
  tld: "com",
  domainName: "nft",
  yearsOnChain: 2.5,
  yearsUntilExpiry: 8.0,
  activeOffersCount: 12,
  livePriceUSD: 10000
}
```

**Scoring Breakdown:**

- Age Score: `min(2.5 × 2, 5) + min(8.0 × 1, 5)` = **10.0**
- Demand Score: `min(12 × 2, 10)` = **10.0**
- TLD Score: **10** (.com is premium)
- Keyword Score: **10** (contains "nft")
- Length Score: **10** (3 characters)
- Combined Keyword Score: `(10 × 0.5) + (10 × 0.3) + (10 × 0.2)` = **10.0**

**Final DomaRank:** `(10 × 2) + (10 × 5) + (10 × 3)` = **100**

**Final Valuation:** `$10,000 × (100/100)` = **$10,000** (no discount)

### Example 2: Average Domain

**Domain**: `example.xyz`

```javascript
{
  nameLength: 7,
  tld: "xyz",
  domainName: "example",
  yearsOnChain: 0.5,
  yearsUntilExpiry: 2.0,
  activeOffersCount: 2,
  livePriceUSD: 500
}
```

**Scoring Breakdown:**

- Age Score: `min(0.5 × 2, 5) + min(2.0 × 1, 5)` = **3.0**
- Demand Score: `min(2 × 2, 10)` = **4.0**
- TLD Score: **8** (.xyz is mid-tier)
- Keyword Score: **4** (no premium keywords)
- Length Score: **7** (6-10 characters)
- Combined Keyword Score: `(8 × 0.5) + (4 × 0.3) + (7 × 0.2)` = **6.6**

**Final DomaRank:** `(3 × 2) + (4 × 5) + (6.6 × 3)` = **45.8**

**Final Valuation:** `$500 × (45.8/100)` = **$229** (54% discount)

### Example 3: New, Long Domain

**Domain**: `verylongdomainname.tech`

```javascript
{
  nameLength: 18,
  tld: "tech",
  domainName: "verylongdomainname",
  yearsOnChain: 0.1,
  yearsUntilExpiry: 1.0,
  activeOffersCount: 0,
  livePriceUSD: 100
}
```

**Scoring Breakdown:**

- Age Score: `min(0.1 × 2, 5) + min(1.0 × 1, 5)` = **1.2**
- Demand Score: `min(0 × 2, 10)` = **0.0**
- TLD Score: **8** (.tech is decent)
- Keyword Score: **4** (no premium keywords)
- Length Score: **4** (>10 characters)
- Combined Keyword Score: `(8 × 0.5) + (4 × 0.3) + (4 × 0.2)` = **6.0**

**Final DomaRank:** `(1.2 × 2) + (0 × 5) + (6.0 × 3)` = **20.4**

**Final Valuation:** `$100 × (20.4/100)` = **$20.40** (80% discount)

## 🎛️ Configuration & Customization

### Premium TLD List

Add or modify TLDs in the `PREMIUM_TLDS` map:

```javascript
const PREMIUM_TLDS = new Map([
  ["com", 10], // Highest value
  ["io", 10],
  ["ai", 10],
  ["net", 9],
  ["org", 9],
  ["xyz", 8],
  // Add more...
]);
```

### Premium Keywords

Add or modify keywords in the `PREMIUM_KEYWORDS` map:

```javascript
const PREMIUM_KEYWORDS = new Map([
  ["crypto", 10],
  ["nft", 10],
  ["defi", 10],
  ["web3", 10],
  // Add more...
]);
```

### Update Frequency

Change the interval in the `setInterval` call:

```javascript
// Current: 10 minutes
const INTERVAL_MS = 10 * 60 * 1000;

// For 5 minutes:
const INTERVAL_MS = 5 * 60 * 1000;

// For 1 hour:
const INTERVAL_MS = 60 * 60 * 1000;
```

### Price Change Threshold

Modify the minimum change percentage for on-chain updates:

```javascript
// Current: 1%
if (Math.abs(changePercent) < 1) {
  console.log(`  ⊘ Skipping (insignificant change)\n`);
  continue;
}

// For 5% threshold:
if (Math.abs(changePercent) < 5) {
  // Skip update
}
```

## 📝 Output Examples

### Console Output (Successful Cycle)

```
============================================================
DOMALEND ORACLE BACKEND - EXECUTION CYCLE
============================================================
Time: 2025-10-02T15:30:00.000Z

📊 Starting data collection from Doma Subgraph...

Found 15 fractional tokens

✓ Collected: crypto.io (0x1234567890...)
✓ Collected: nft.com (0xabcdef1234...)
✓ Collected: example.xyz (0x9876543210...)

✅ Collected data for 15 domains

🧠 Calculating DomaRank scores and valuations...

✓ crypto.io
  DomaRank: 87.2/100
  Valuation: $8,720.50
  Breakdown: Age=8.5, Demand=10.0, Keywords=9.2

✓ nft.com
  DomaRank: 100.0/100
  Valuation: $15,000.00
  Breakdown: Age=10.0, Demand=10.0, Keywords=10.0

✅ Calculated 15 valuations

⛓️  Starting on-chain price broadcasting...

Broadcaster address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
Wallet balance: 0.5 ETH

[1/15] Broadcasting crypto.io...
  Address: 0x1234567890abcdef1234567890abcdef12345678
  Price: $8720.5 (8720500000000000000000 Wei)
  Current on-chain: 8500.3 USD
  Price change: 2.59%
  Transaction hash: 0xabc123...
  Waiting for confirmation...
  ✓ Confirmed in block 1234567
  Gas used: 45231

[2/15] Broadcasting nft.com...
  Address: 0xabcdef1234567890abcdef1234567890abcdef12
  Price: $15000.0 (15000000000000000000000 Wei)
  Current on-chain: 14950.0 USD
  Price change: 0.33%
  ⊘ Skipping (insignificant change)

============================================================
BROADCASTING SUMMARY
============================================================
Total valuations: 15
Successful: 12
Failed: 0
Skipped: 3
============================================================

============================================================
CYCLE COMPLETE
============================================================
Duration: 45.32s
Next cycle in 10 minutes
============================================================
```

## 🔧 Troubleshooting

### Issue: "Authentication Required" or "Unauthorized"

**Cause**: Missing or invalid Doma API key

**Solution**:

1. Obtain API key from Doma team or dashboard
2. Add to `.env` file: `DOMA_API_KEY=your_key_here`
3. Restart the backend service
4. Verify API key is configured: Check startup logs for "API Key: ✓ Configured"

### Issue: "No domain data collected"

**Cause**: Subgraph API is down, returning empty results, or authentication failed

**Solution**:

1. Verify API key is set: `echo $DOMA_API_KEY` or check `.env` file
2. Test API access with curl:

```bash
curl -H "API-KEY: your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"query":"query { fractionalTokens { items { id } } }"}' \
     https://api-testnet.doma.xyz/graphql
```

3. Check Subgraph URL is correct
4. Verify network connectivity
5. Try running `npm run test-subgraph`

### Issue: "Insufficient balance for gas fees"

**Cause**: Wallet has no ETH

**Solution**:

1. Check balance: `cast balance $YOUR_ADDRESS --rpc-url https://rpc-testnet.doma.xyz`
2. Bridge ETH: https://bridge-testnet.doma.xyz
3. Verify wallet address in console output

### Issue: "DOMA_RANK_ORACLE_ADDRESS not configured"

**Cause**: Environment variable not set

**Solution**:

1. Deploy DomaRankOracle contract
2. Add address to `.env` file
3. Restart the backend

### Issue: "Transaction always fails"

**Possible Causes**:

- Not the owner of the oracle contract
- Oracle contract not deployed
- Incorrect private key
- Network mismatch

**Solution**:

1. Verify you deployed the oracle: `cast call $ORACLE_ADDRESS "owner()" --rpc-url https://rpc-testnet.doma.xyz`
2. Verify your address matches: `cast wallet address --private-key $PRIVATE_KEY`
3. Check correct network (Chain ID: 97476)

## 🛡️ Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use a dedicated wallet** - Don't use your main wallet
3. **Fund only what's needed** - Estimate: 0.05 ETH per week
4. **Rotate keys regularly** - Update private key monthly
5. **Monitor transactions** - Check https://explorer-testnet.doma.xyz
6. **Use environment variables** - Never hardcode credentials

## 📊 Monitoring & Analytics

### Track Key Metrics

1. **Success Rate**: Successful updates / Total attempts
2. **Gas Consumption**: Monitor daily/weekly costs
3. **Price Accuracy**: Compare valuations with market
4. **Uptime**: Track system availability

### Recommended Monitoring

```bash
# View logs
npm run backend | tee logs/oracle-$(date +%Y%m%d).log

# Track gas costs
cast balance $YOUR_ADDRESS --rpc-url https://rpc-testnet.doma.xyz

# Check oracle prices
cast call $ORACLE_ADDRESS "getTokenValue(address)" $TOKEN_ADDRESS --rpc-url https://rpc-testnet.doma.xyz
```

## 🚀 Production Deployment

### Option 1: PM2 (Process Manager)

```bash
npm install -g pm2

pm2 start src/oracle-backend.js --name "doma-oracle"
pm2 save
pm2 startup
```

### Option 2: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

CMD ["node", "src/oracle-backend.js"]
```

Build and run:

```bash
docker build -t doma-oracle .
docker run -d --env-file .env --name doma-oracle doma-oracle
```

### Option 3: Systemd Service

Create `/etc/systemd/system/doma-oracle.service`:

```ini
[Unit]
Description=DomaLend Oracle Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/DomaLend/backend
ExecStart=/usr/bin/node src/oracle-backend.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=doma-oracle

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable doma-oracle
sudo systemctl start doma-oracle
sudo systemctl status doma-oracle
```

## 📚 API Reference

### Main Functions

#### `getConsolidatedDomainData()`

Fetches all fractional token data from the Subgraph.

**Returns**: `Promise<Array>` - Array of domain data objects

**Example**:

```javascript
const data = await getConsolidatedDomainData();
// [{ fractionalTokenAddress, domainName, tld, ... }]
```

#### `calculateDomaRank(domainData)`

Calculates DomaRank score and valuation for a domain.

**Parameters**:

- `domainData` (Object) - Domain data from collector

**Returns**: Object with rank and valuation

**Example**:

```javascript
const valuation = calculateDomaRank(domainData);
// { domaRank: 87.2, finalValuationUSD: 8720.50, ... }
```

#### `broadcastPricesOnChain(valuations)`

Sends price updates to the blockchain.

**Parameters**:

- `valuations` (Array) - Array of valuation objects

**Returns**: `Promise<void>`

**Example**:

```javascript
await broadcastPricesOnChain([
  { fractionalTokenAddress: "0x...", finalValuationWei: "..." },
]);
```

#### `main()`

Orchestrates the complete cycle.

**Returns**: `Promise<void>`

## 🎓 What Makes This System Production-Ready

✅ **Robust Error Handling** - Try/catch blocks everywhere  
✅ **Gas Optimization** - Skips unnecessary updates  
✅ **Rate Limiting** - Prevents RPC throttling  
✅ **Comprehensive Logging** - Full transaction tracking  
✅ **Graceful Shutdown** - SIGINT handler  
✅ **Balance Checking** - Prevents failed transactions  
✅ **Configuration Validation** - Warns about missing values  
✅ **Modular Design** - Easy to test and extend  
✅ **Type Safety** - Clear function signatures  
✅ **Documentation** - Inline comments throughout

## 🏆 Next Steps

1. **Deploy to Production** - Use PM2 or Docker
2. **Set Up Monitoring** - Add Grafana dashboards
3. **Implement Alerts** - Notify on failures
4. **Add Testing** - Unit tests for scoring logic
5. **Optimize Gas** - Batch multiple updates
6. **Add Analytics** - Track scoring accuracy
7. **Implement Backup** - Secondary RPC endpoints
8. **Add Multi-Sig** - For oracle ownership

---

**System Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: October 2025  
**Network**: Doma Testnet (Chain ID: 97476)
