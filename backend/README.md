# DomaLend Backend Service

Backend service for collecting Doma fractional token data and updating the DomaRank oracle on-chain with AI-powered valuations.

## 🎯 Overview

This service acts as the "Brain" and "Messenger" connecting off-chain domain data analysis to on-chain price feeds. It automatically:

1. **Discovers** all fractional domain tokens from Doma's Subgraph
2. **Analyzes** each domain using AI scoring algorithms
3. **Calculates** risk-adjusted USD valuations
4. **Updates** the on-chain DomaRankOracle contract
5. **Repeats** this process every 5 minutes (configurable)

## ✨ Features

- **Data Collection**: Fetches domain data from Doma's Subgraph GraphQL API
- **AI Scoring Engine**: Weighted algorithm that evaluates domains based on length, TLD, and sales history
- **Risk-Adjusted Valuations**: Calculates market-aware token prices with 18 decimal precision
- **Automated Oracle Updates**: Continuously updates on-chain prices via DomaRankOracle contract
- **Batch Processing**: Efficiently handles multiple tokens with rate limiting
- **Smart Updates**: Only updates prices when changes exceed 1% threshold
- **Gas Optimization**: Estimates gas and skips unnecessary updates
- **Error Recovery**: Graceful error handling with detailed logging
- **Scheduled Execution**: Configurable update intervals (default: 5 minutes)

## Installation

```bash
npm install
```

## Configuration

1. Copy the example configuration:

```bash
cp config.example.js config.js
```

2. Update `config.js` with your values:
   - `domaSubgraphUrl`: Your Doma Subgraph endpoint
   - `rpcUrl`: Blockchain RPC endpoint
   - `domaRankOracleAddress`: Deployed DomaRankOracle contract address
   - `oracleUpdaterPrivateKey`: Private key with owner access to oracle

## 🚀 Quick Start

> **🆕 NEW: Complete Integrated Backend Available!**
>
> We now offer a complete all-in-one backend system (`oracle-backend.js`) that includes:
>
> - ✅ Data collection from Doma Subgraph
> - ✅ AI-powered scoring algorithm (DomaRank)
> - ✅ On-chain price broadcasting
> - ✅ Automatic scheduling (every 10 minutes)
>
> **Quick Start:**
>
> ```bash
> npm install
> cp .env.example .env  # Add your config
> npm run test-backend  # Test the scoring
> npm run backend       # Start the complete system
> ```
>
> **See [ORACLE_BACKEND_GUIDE.md](./ORACLE_BACKEND_GUIDE.md) for complete documentation.**

---

### Option 1: Complete Integrated Backend (Recommended)

Use `oracle-backend.js` for a production-ready, all-in-one solution:

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env: Add RPC_URL, DOMA_RANK_ORACLE_ADDRESS, ORACLE_UPDATER_PRIVATE_KEY

# Test scoring algorithm
npm run test-backend

# Start the complete backend (runs every 10 minutes)
npm run backend
```

### Option 2: Modular Components (Advanced Users)

Use individual components for fine-grained control:

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy and edit the configuration file:

```bash
cp config.example.js config.js
# Edit config.js with your values
```

Required configuration:

- `DOMA_SUBGRAPH_URL`: Doma's Subgraph GraphQL endpoint (https://api-testnet.doma.xyz/graphql)
- `RPC_URL`: Blockchain RPC endpoint (https://rpc-testnet.doma.xyz for Doma Testnet)
- `DOMA_RANK_ORACLE_ADDRESS`: Deployed DomaRankOracle contract address
- `ORACLE_UPDATER_PRIVATE_KEY`: Private key with owner access to oracle

**Doma Testnet Details:**

- Chain ID: 97476
- RPC: https://rpc-testnet.doma.xyz
- Explorer: https://explorer-testnet.doma.xyz
- Subgraph: https://api-testnet.doma.xyz/graphql

### 3. Start the Oracle Service

```bash
# Start with automatic scheduling (runs every 5 minutes)
npm start

# Or run a single update cycle and exit
npm run start:once

# Development mode with auto-reload
npm run dev
```

## 📖 Usage

### Automated Oracle Service (Recommended)

The main service automatically handles the entire pipeline:

```bash
npm start
```

This will:

- ✅ Fetch all fractional tokens from Doma Subgraph
- ✅ Calculate AI-powered valuations for each token
- ✅ Update the DomaRankOracle contract on-chain
- ✅ Repeat every 5 minutes (configurable)
- ✅ Log all activities and errors
- ✅ Skip unnecessary updates (< 1% price change)

**Output:**

```
============================================================
STARTING UPDATE CYCLE
============================================================
Time: 2024-01-01T12:00:00.000Z
Run #1

📊 Step 1: Fetching fractional tokens from subgraph...
✓ Total fractional tokens found: 25

🔄 Step 2: Processing 25 tokens...
[1/25] 0x742d35cc...
  Domain: cool.xyz
  Calculated Price: 0.012500 ETH
  Quality Score: 68.50/100
  ✓ Processed successfully

⛓️  Step 3: Updating oracle with 25 prices...
[1/25] Processing 0x742d35cc...
  New price: 12500000000000000 Wei
  Current price: 12000000000000000 Wei
  Transaction sent: 0xabc123...
  ✓ Transaction confirmed in block 12345
  Gas used: 45000
  Price change: +4.17%

============================================================
UPDATE CYCLE SUMMARY
============================================================
Duration: 45.23s
Tokens Found: 25
Tokens Processed: 25
Valuations Calculated: 25
Oracle Updates Attempted: 25
  - Successful: 20
  - Skipped: 5
  - Failed: 0
============================================================
```

### Manual Data Collection

Run the data collector to fetch domain data:

```bash
npm run collect
```

Or import and use in your code:

```javascript
import {
  fetchDomainDataByToken,
  calculateSalesStatistics,
} from "./src/dataCollector.js";

const tokenAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
const domainData = await fetchDomainDataByToken(tokenAddress);

console.log("Domain Name:", domainData.domainName);
console.log("TLD:", domainData.tld);
console.log("Length:", domainData.nameLength);
console.log("Market Cap:", domainData.marketCap);
console.log("Sales History:", domainData.salesHistory);

const stats = calculateSalesStatistics(domainData);
console.log("Average Price:", stats.averagePrice);
```

### AI Pricing Engine

Calculate risk-adjusted valuations for tokens:

```bash
npm run test-pricing        # Test with mock data
npm run test-pricing live   # Test with live subgraph data
```

Or use in your code:

```javascript
import {
  calculateDomaValue,
  calculateDomainScore,
} from "./src/pricingEngine.js";
import { fetchDomainDataByToken } from "./src/dataCollector.js";

// Get domain data
const domainData = await fetchDomainDataByToken(tokenAddress);

// Calculate valuation
const valuation = calculateDomaValue(domainData);

// Final price for oracle (18 decimals)
console.log("Price:", valuation.priceUSD18Decimals);

// Human-readable results
console.log("Per Token:", valuation.humanReadable.priceInETH, "ETH");
console.log("Quality:", valuation.humanReadable.qualityRating);

// Detailed breakdown
console.log("Domain Score:", valuation.breakdown.domainScore);
console.log("Length Score:", valuation.breakdown.lengthScore);
console.log("TLD Score:", valuation.breakdown.tldScore);
console.log("Sales Score:", valuation.breakdown.salesScore);
```

## Data Structure

The `fetchDomainDataByToken` function returns:

```javascript
{
  tokenAddress: '0x...',
  domainName: 'example.xyz',
  tld: 'xyz',
  nameLength: 7,
  salesHistory: [
    {
      id: '...',
      price: '1000000000000000000', // Wei format
      timestamp: 1234567890,
      date: '2024-01-01T00:00:00.000Z',
      buyer: '0x...',
      seller: '0x...'
    }
  ],
  marketCap: '10000000000000000000',
  fractionalToken: {
    address: '0x...',
    totalSupply: '1000000',
    currentPrice: '10000000000000000'
  },
  metadata: {
    createdAt: '...',
    updatedAt: '...',
    lastSalePrice: '...',
    totalSales: 5
  }
}
```

### Valuation Output

The `calculateDomaValue` function returns:

```javascript
{
  // Final price in USD with 18 decimals (ready for oracle)
  priceUSD18Decimals: "12500000000000000",  // Wei format

  // Detailed scoring breakdown
  breakdown: {
    domainScore: "68.50",          // Overall quality score (0-100)
    lengthScore: "75.00",          // Score based on name length
    tldScore: "70.00",             // Score based on TLD tier
    salesScore: "45.00",           // Score based on sales history
    baseValue: "10000000000000000000",  // Base valuation in Wei
    qualityMultiplier: "1.185",    // Quality adjustment factor
    riskAdjustment: "0.900",       // Risk adjustment factor
    finalValuation: "10665000000000000000",  // Total valuation
    totalSupply: "1000",           // Number of tokens
    pricePerToken: "12500000000000000"  // Price per token
  },

  // Human-readable values
  humanReadable: {
    priceInETH: "0.012500",        // Price per token in ETH
    priceInUSD: "$0.01",           // Price per token in USD
    totalValuationInETH: "10.665000",  // Total project value in ETH
    totalValuationInUSD: "$10.67",     // Total project value in USD
    qualityRating: "Good"          // Text rating: Excellent/Good/Average/Below Average
  },

  // Metadata
  metadata: {
    domainName: "cool.xyz",
    tld: "xyz",
    nameLength: 4,
    tokenAddress: "0x...",
    timestamp: "2024-01-01T00:00:00.000Z",
    version: "1.0.0"
  }
}
```

## Pricing Algorithm

The AI Scoring Engine uses a weighted scoring system:

- **50% Domain Length**: Shorter domains score higher (1-3 chars = premium)
- **30% TLD Quality**: Popular TLDs (.com, .io, .ai) score higher
- **20% Sales History**: More sales and higher prices improve score

### Risk Adjustments

The engine applies conservative risk factors:

- No market cap data: 0.7x multiplier
- No trading history: 0.8x multiplier
- Thin trading (<3 sales): 0.9x multiplier
- Stale market (>1 year): 0.85x multiplier

## 📜 Available Scripts

### Main Commands

- **`npm start`** - Start automated oracle service with scheduling
- **`npm run start:once`** - Run single update cycle and exit
- **`npm run dev`** - Development mode with auto-reload

### Testing & Development

- **`npm run test-pricing`** - Test pricing engine with mock data
- **`npm run test-pricing live [address]`** - Test pricing with live subgraph data
- **`npm run test-oracle`** - Test oracle connection and permissions
- **`npm run test-subgraph`** - Test subgraph queries
- **`npm run collect`** - Manually run data collector
- **`npm run info`** - Display service information

## ⚙️ Configuration

### Environment Variables

Create a `.env` file or use `config.js`:

```env
# Doma Subgraph (REQUIRED)
DOMA_SUBGRAPH_URL=https://api-testnet.doma.xyz/graphql

# Doma API Key (REQUIRED - get from Doma team)
DOMA_API_KEY=your_api_key_here

# Blockchain (Doma Testnet)
RPC_URL=https://rpc-testnet.doma.xyz
DOMA_CHAIN_ID=97476
DOMA_RANK_ORACLE_ADDRESS=0x...

# Doma Contract Addresses (for reference)
DOMA_OWNERSHIP_TOKEN=0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f
DOMA_RECORD=0xF6A92E0f8bEa4174297B0219d9d47fEe335f84f8

# Authentication
ORACLE_UPDATER_PRIVATE_KEY=0x...

# Scheduling (optional)
UPDATE_INTERVAL_MS=300000        # 5 minutes
MAX_TOKENS_PER_RUN=50           # Process 50 tokens per cycle
```

### Configuration Options

| Option                     | Default        | Description                            |
| -------------------------- | -------------- | -------------------------------------- |
| `UPDATE_INTERVAL_MS`       | 300000 (5 min) | Time between update cycles             |
| `MAX_TOKENS_PER_RUN`       | 50             | Maximum tokens to process per run      |
| `DELAY_BETWEEN_UPDATES`    | 2000ms         | Delay between blockchain transactions  |
| `MIN_PRICE_CHANGE_PERCENT` | 1%             | Minimum price change to trigger update |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Oracle Orchestrator                     │
│                   (orchestrator.js)                      │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     ┌────────┐      ┌────────┐     ┌─────────┐
     │ Data   │      │ Pricing│     │ Oracle  │
     │Collector│─────▶│ Engine │────▶│ Updater │
     └────────┘      └────────┘     └─────────┘
          │               │               │
          ▼               ▼               ▼
   ┌──────────┐    ┌──────────┐   ┌──────────┐
   │  Doma    │    │  AI      │   │  Blockchain
   │ Subgraph │    │  Scoring │   │  (Somnia)  │
   └──────────┘    └──────────┘   └──────────┘
```

### Components

1. **Data Collector** (`dataCollector.js`)

   - Queries Doma Subgraph for domain data
   - Fetches sales history, TLD, market cap
   - Handles pagination and errors

2. **Pricing Engine** (`pricingEngine.js`)

   - AI scoring algorithm (50% length, 30% TLD, 20% sales)
   - Risk adjustment calculations
   - Outputs 18-decimal USD prices

3. **Oracle Updater** (`oracleUpdater.js`)

   - Manages blockchain transactions
   - Batch updates with rate limiting
   - Gas optimization and error recovery

4. **Orchestrator** (`orchestrator.js`)
   - Coordinates entire pipeline
   - Scheduled execution (every 5 minutes)
   - Statistics and monitoring

## 🚢 Deployment Guide

### Prerequisites

1. **Deploy DomaRankOracle.sol on Doma Testnet**

   ```bash
   cd ../contracts
   forge create src/DomaRankOracle.sol:DomaRankOracle \
     --rpc-url https://rpc-testnet.doma.xyz \
     --private-key $PRIVATE_KEY

   # Verify on Doma Explorer: https://explorer-testnet.doma.xyz
   ```

2. **Fund the Updater Wallet**

   - Transfer some native tokens for gas fees
   - Recommended: 0.1 ETH for initial testing

3. **Verify Permissions**
   - Ensure updater wallet is the owner of DomaRankOracle
   - Test with `npm run test-oracle`

### Production Deployment

1. **Environment Setup**

   ```bash
   cp config.example.js config.js
   # Edit config.js with production values
   ```

2. **Test the Pipeline**

   ```bash
   # Test individual components
   npm run test-subgraph
   npm run test-pricing
   npm run test-oracle

   # Test single update cycle
   npm run start:once
   ```

3. **Start the Service**

   ```bash
   # Using PM2 (recommended for production)
   npm install -g pm2
   pm2 start npm --name "doma-oracle" -- start
   pm2 save
   pm2 startup

   # Or use systemd, Docker, etc.
   ```

4. **Monitor Logs**
   ```bash
   pm2 logs doma-oracle
   ```

## 🔒 Security Best Practices

### Critical Security Measures

- ✅ **Never commit credentials** - Add `config.js` and `.env` to `.gitignore`
- ✅ **Use dedicated wallet** - Create a separate wallet for oracle updates
- ✅ **Minimal funds** - Keep only enough for gas fees (refill as needed)
- ✅ **Monitor transactions** - Set up alerts for failed updates
- ✅ **Rate limiting** - Built-in delays prevent RPC spam
- ✅ **Error recovery** - Graceful handling of network issues

### Production Recommendations

1. **Multi-Sig Ownership**: Transfer oracle ownership to multi-sig for production
2. **Governance**: Implement DAO voting for major parameter changes
3. **Monitoring**: Set up alerts for:
   - Failed oracle updates
   - Low wallet balance
   - Abnormal gas costs
   - Stale prices
4. **Backup Systems**: Run redundant instances in different regions
5. **Price Bounds**: Add sanity checks for extreme price changes

## 🐛 Troubleshooting

### Common Issues

**Oracle updates failing:**

```bash
# Check wallet balance
npm run test-oracle

# Verify ownership
# Expected: wallet address matches oracle owner

# Check RPC connection
curl -X POST $RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**No tokens found from subgraph:**

```bash
# Test subgraph connection
npm run test-subgraph

# Verify DOMA_SUBGRAPH_URL is correct
echo $DOMA_SUBGRAPH_URL
```

**High gas costs:**

- Increase `MIN_PRICE_CHANGE_PERCENT` to reduce update frequency
- Decrease `MAX_TOKENS_PER_RUN` to process fewer tokens per cycle
- Check for network congestion

**Pricing errors:**

```bash
# Test pricing engine with mock data
npm run test-pricing

# Test with specific token
npm run test-pricing live 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

## 📊 Monitoring & Metrics

The service tracks comprehensive statistics:

```javascript
{
  totalRuns: 100,
  totalTokensProcessed: 2500,
  totalUpdatesSuccessful: 2000,
  totalUpdatesFailed: 50,
  lastRunTime: "2024-01-01T12:00:00.000Z",
  isRunning: false,
  schedulerActive: true
}
```

Access statistics programmatically or via logs.

## 📚 Documentation

- **[API_KEY_SETUP.md](./API_KEY_SETUP.md)** - 🔑 How to obtain and configure your Doma API key
- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[ORACLE_BACKEND_GUIDE.md](./ORACLE_BACKEND_GUIDE.md)** - Complete backend system guide
- **[NETWORK_CONFIG.md](./NETWORK_CONFIG.md)** - Doma testnet details & deployed contracts
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete technical architecture
- **[PRICING_ALGORITHM.md](./PRICING_ALGORITHM.md)** - Deep dive into AI scoring

## 🎓 What You've Built

Congratulations! You now have a complete oracle system:

### ✅ Smart Contracts

- **DomaRankOracle.sol** - On-chain price storage
- **IDomaRankOracle** - Interface for DomaLend integration
- **IDomaOwnershipToken** - Compliance checking interface

### ✅ Backend Services

- **Data Collector** - Fetches domain data from Doma Subgraph
- **AI Pricing Engine** - Calculates risk-adjusted valuations
- **Oracle Updater** - Manages blockchain transactions
- **Orchestrator** - Automates the entire pipeline

### ✅ Integration

- **DomaLend** - Modified to use DomaRank for fractional tokens
- **Dual Oracle Support** - Chainlink for standard tokens, DomaRank for fractional

### 🔄 The Complete Flow

```
Fractional Domain Token (NFT)
         ↓
   Doma Subgraph
         ↓
   Data Collector → AI Scoring → Risk Adjustment
         ↓
   DomaRank Oracle (on-chain)
         ↓
   DomaLend Contract
         ↓
   Accepts as Collateral!
```

## 🎯 Next Steps

### Immediate

1. ✅ Test the complete system with `npm run start:once`
2. ✅ Deploy to production with PM2 or Docker
3. ✅ Monitor first 24 hours closely
4. ✅ Set up alerting for failures

### Short Term

1. Fine-tune scoring weights based on market feedback
2. Add more TLD tiers for better accuracy
3. Implement machine learning for predictions
4. Create admin dashboard for monitoring

### Long Term

1. Multi-chain expansion
2. DAO governance for parameters
3. Decentralized oracle network
4. Advanced analytics and APIs

## 📞 Support

- **Issues**: Check troubleshooting section in README
- **Questions**: Review ARCHITECTURE.md for technical details
- **Quick Start**: Follow QUICKSTART.md for setup

---

**Built with ❤️ for the Doma and DomaLend ecosystems**
