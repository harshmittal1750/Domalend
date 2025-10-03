# DreamLend Indexer Guide

## Overview

The DreamLend Indexer is a custom blockchain event indexer that replaces The Graph subgraph. It indexes loan events from the DreamLend smart contract and serves them via REST and GraphQL APIs that are **100% compatible** with your existing frontend code.

## Why We Need This

1. **Doma Network Support**: The Graph may not support the Doma testnet/mainnet
2. **Custom Token Support**: We need to index both standard ERC20 tokens and Doma fractional domain tokens
3. **Oracle Integration**: Direct integration with DomaRank oracle for pricing
4. **Real-time Updates**: Faster event indexing with configurable polling intervals
5. **No Frontend Changes**: API matches existing subgraph schema exactly

## Architecture

```
┌─────────────────┐
│  DreamLend      │
│  Smart Contract │
└────────┬────────┘
         │ Events
         ▼
┌─────────────────┐
│  Event Indexer  │ ◄── Polls blockchain every 5s
│  (EventIndexer) │
└────────┬────────┘
         │ Stores events
         ▼
┌─────────────────┐
│  In-Memory      │
│  Storage        │
└────────┬────────┘
         │ Serves data
         ▼
┌─────────────────┐
│  Indexer Server │ ◄── REST & GraphQL APIs
│  (Express)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │ ◄── No changes needed!
│  (Next.js)      │
└─────────────────┘
```

## Features

### Event Indexing

The indexer automatically tracks these events:

- ✅ **LoanCreated**: New loan offers
- ✅ **LoanAccepted**: Loan offers accepted by borrowers
- ✅ **LoanRepaid**: Successful loan repayments
- ✅ **LoanLiquidated**: Liquidated loans
- ✅ **LoanOfferCancelled**: Cancelled loan offers
- ✅ **LoanOfferRemoved**: Removed loan offers
- ✅ **DomaRankOracleSet**: Oracle address updates

### API Endpoints

#### GraphQL Endpoint (Compatible with The Graph)

```
POST http://localhost:3001/graphql

Content-Type: application/json

{
  "query": "query GetLoanCreateds { loanCreateds(first: 100, orderBy: blockTimestamp, orderDirection: desc) { id loanId lender amount ... } }"
}
```

#### REST Endpoints

- `GET /health` - Health check and indexer status
- `GET /api/loans/created` - Get loan created events
- `GET /api/loans/accepted` - Get loan accepted events
- `GET /api/loans/repaid` - Get loan repaid events
- `GET /api/loans/liquidated` - Get loan liquidated events
- `GET /api/loans/cancelled` - Get loan cancelled events
- `GET /api/loans/removed` - Get loan removed events
- `GET /api/stats` - Get protocol statistics
- `GET /api/loans/all` - Get all events in one call

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Add these to your `backend/.env`:

```bash
# === Indexer Configuration ===

# Your deployed DreamLend contract address
DREAM_LEND_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# Somnia RPC URL (or your blockchain RPC)
SOMNIA_RPC_URL=https://rpc-testnet.doma.xyz

# Block to start indexing from (0 = from genesis, or recent block number)
INDEXER_START_BLOCK=0

# How often to poll for new events (milliseconds)
INDEXER_POLL_INTERVAL=5000

# Port for the indexer API server
INDEXER_PORT=3001

# CORS origin (use * for development, specific origin for production)
INDEXER_CORS_ORIGIN=*
```

### 3. Compile Smart Contracts

The indexer needs the DreamLend ABI:

```bash
cd contracts
forge build
```

### 4. Run the Indexer

```bash
cd backend

# Production mode
npm run indexer

# Development mode (auto-restart on changes)
npm run indexer:dev
```

## Usage

### Starting the Indexer

```bash
$ npm run indexer

============================================================
🚀 DREAMLEND INDEXER
============================================================
Configuration:
  RPC URL: https://rpc-testnet.doma.xyz
  Contract: 0x1234...5678
  Start Block: 0
  Poll Interval: 5000ms
  Server Port: 3001
============================================================

🔍 Initializing EventIndexer...
✓ Indexer initialized. Will start from block 0

📚 Syncing historical events from block 0 to 12345...
✓ Historical sync complete. Processed 42 loan creations

🔄 Starting event polling (interval: 5000ms)
✓ Indexer started

============================================================
📡 INDEXER SERVER STARTED
============================================================
Port: 3001
Health: http://localhost:3001/health
GraphQL: http://localhost:3001/graphql
REST API: http://localhost:3001/api/*
============================================================

✅ DreamLend Indexer is running!
```

### Testing the API

#### Check Health

```bash
curl http://localhost:3001/health
```

Response:

```json
{
  "status": "ok",
  "indexer": {
    "isIndexing": true,
    "currentBlock": 12345,
    "lastProcessedBlock": 12345,
    "totalLoansIndexed": 42,
    "stats": {
      "totalLoansCreated": "42",
      "totalLoanVolume": "1000000000000000000000",
      "totalLoanVolumeUSD": "1000"
    }
  },
  "timestamp": "2025-10-02T21:00:00.000Z"
}
```

#### Get Loan Events

```bash
curl "http://localhost:3001/api/loans/created?first=10&skip=0&orderBy=blockTimestamp&orderDirection=desc"
```

#### Test GraphQL Query

```bash
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { loanCreateds(first: 10, orderBy: blockTimestamp, orderDirection: desc) { id loanId lender amount tokenAddress collateralAddress blockTimestamp } }"
  }'
```

## Frontend Integration

### Option 1: Update Subgraph API Endpoint (Recommended)

Update `src/app/api/subgraph/route.ts`:

```typescript
const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:3001/graphql";
```

### Option 2: Update Frontend Environment

Add to `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:3001/graphql
```

### Vercel Deployment

For production, set environment variable in Vercel dashboard:

```
NEXT_PUBLIC_SUBGRAPH_URL=https://your-indexer-domain.com/graphql
```

## Data Structure

The indexer returns data in the **exact same format** as The Graph subgraph:

### LoanCreated Event

```typescript
{
  id: string; // txHash-logIndex
  loanId: string; // Loan ID
  lender: string; // Lender address (lowercase)
  tokenAddress: string; // Loan token address
  amount: string; // Loan amount (wei)
  interestRate: string; // Interest rate (basis points)
  duration: string; // Loan duration (seconds)
  collateralAddress: string; // Collateral token address
  collateralAmount: string; // Collateral amount (wei)
  minCollateralRatioBPS: string;
  liquidationThresholdBPS: string;
  maxPriceStaleness: string;
  blockNumber: string;
  blockTimestamp: string; // Unix timestamp
  transactionHash: string;
  priceUSD: string; // Historical price (USD)
  amountUSD: string; // Historical value (USD)
}
```

## Monitoring

### Real-time Logs

The indexer logs all indexed events:

```
📦 Indexed 3 new events up to block 12350
  📄 New loan created: ID=5, Amount=1000000000000000000000
  ✅ Loan accepted: ID=3, Borrower=0xabcd...
  💰 Loan repaid: ID=1
```

### Health Endpoint

Monitor indexer health:

```bash
GET /health

{
  "status": "ok",
  "indexer": {
    "isIndexing": true,
    "currentBlock": 12350,
    "lastProcessedBlock": 12350,
    "totalLoansIndexed": 45
  }
}
```

## Production Deployment

### 1. Use a Database (Recommended)

For production, replace in-memory storage with a database:

```javascript
// Instead of this.storage = {}
// Use PostgreSQL, MongoDB, etc.
import { Database } from "./database.js";
this.db = new Database();
```

### 2. Use PM2 for Process Management

```bash
npm install -g pm2

pm2 start src/indexer/index.js --name dreamlend-indexer
pm2 startup
pm2 save
```

### 3. Enable HTTPS

Use nginx as reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Monitor with PM2 Plus

```bash
pm2 link <secret> <public>
pm2 install pm2-logrotate
```

## Troubleshooting

### Indexer Not Starting

**Error**: `DREAM_LEND_CONTRACT_ADDRESS not set`

**Solution**: Add your deployed contract address to `.env`

### No Events Indexed

**Issue**: `totalLoansIndexed: 0`

**Solutions**:

1. Check if contract has any events: `cast logs --address YOUR_CONTRACT`
2. Verify start block: Set `INDEXER_START_BLOCK` to deployment block
3. Check RPC connection: `curl $SOMNIA_RPC_URL`

### Frontend Not Receiving Data

**Issue**: Network errors or empty responses

**Solutions**:

1. Check CORS: Set `INDEXER_CORS_ORIGIN=*` for development
2. Verify indexer is running: `curl http://localhost:3001/health`
3. Check frontend API endpoint matches indexer port

### Events Missing

**Issue**: Some events not showing up

**Solutions**:

1. Wait for indexer to catch up (check `currentBlock` vs blockchain height)
2. Force resync: Stop indexer, set `INDEXER_START_BLOCK=0`, restart
3. Check event names match contract: `forge inspect DreamLend events`

## Performance Tuning

### Polling Interval

- **Fast updates**: `INDEXER_POLL_INTERVAL=2000` (2 seconds)
- **Balanced**: `INDEXER_POLL_INTERVAL=5000` (5 seconds)
- **Resource-light**: `INDEXER_POLL_INTERVAL=15000` (15 seconds)

### Batch Size

For large historical syncs, adjust the query range in `EventIndexer.js`:

```javascript
// Sync in smaller batches for very large block ranges
const BATCH_SIZE = 1000;
for (let i = fromBlock; i <= toBlock; i += BATCH_SIZE) {
  const batchEnd = Math.min(i + BATCH_SIZE, toBlock);
  await this.syncBatch(i, batchEnd);
}
```

## API Reference

### Query Parameters

All REST endpoints support these query parameters:

- `first`: Number of results to return (default: 100)
- `skip`: Number of results to skip (default: 0)
- `orderBy`: Field to sort by (default: "blockTimestamp")
- `orderDirection`: Sort direction "asc" or "desc" (default: "desc")

### Example Queries

Get recent 10 loans:

```
GET /api/loans/created?first=10&orderDirection=desc
```

Get loans with pagination:

```
GET /api/loans/created?first=20&skip=40
```

Get all data for a specific address (implement custom endpoint):

```
GET /api/loans/by-lender/0x123...?first=100
```

## Next Steps

1. ✅ Run the indexer
2. ✅ Test API endpoints
3. ✅ Update frontend to use new API
4. ✅ Deploy to production
5. 🔜 Add database persistence
6. 🔜 Add custom queries for Doma tokens
7. 🔜 Integrate with DomaRank oracle for historical prices

## Support

For issues or questions:

1. Check logs: The indexer provides detailed logging
2. Test API manually: Use `curl` or Postman
3. Verify contract events: Use block explorer or `cast logs`
