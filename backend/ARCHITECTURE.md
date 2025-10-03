# DomaRank Oracle Architecture

Complete technical architecture for the DomaRank fractional domain token oracle system.

## System Overview

The DomaRank Oracle is a fully automated system that bridges off-chain domain data analysis with on-chain price feeds for fractional domain tokens. It continuously monitors domain metrics, calculates risk-adjusted valuations using AI scoring, and updates blockchain oracles with precise USD pricing.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│                     (DomaLend Frontend)                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Smart Contracts Layer                         │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │  DomaLend   │───▶│ DomaRank     │    │  Fractional     │  │
│  │  Contract    │    │  Oracle      │    │  Domain Tokens  │  │
│  └──────────────┘    └──────┬───────┘    └─────────────────┘  │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                         reads prices
                                │
                                ▲
                         updates prices
                                │
┌───────────────────────────────┼──────────────────────────────────┐
│                    Backend Oracle Service                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Oracle Orchestrator                         │   │
│  │           (Automated Scheduler)                          │   │
│  │     • Runs every 5 minutes                               │   │
│  │     • Manages entire pipeline                            │   │
│  │     • Error recovery & logging                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                                  │
│        ┌───────────────────────┼────────────────────┐           │
│        │                       │                    │           │
│        ▼                       ▼                    ▼           │
│  ┌──────────┐          ┌─────────────┐      ┌─────────────┐   │
│  │  Data    │          │   Pricing   │      │   Oracle    │   │
│  │Collector │─────────▶│   Engine    │─────▶│   Updater   │   │
│  │          │  domain  │ (AI Scoring)│ price│ (Blockchain)│   │
│  │          │   data   │             │      │             │   │
│  └────┬─────┘          └─────────────┘      └──────┬──────┘   │
│       │                                             │           │
└───────┼─────────────────────────────────────────────┼───────────┘
        │                                             │
        ▼                                             ▼
┌─────────────┐                              ┌──────────────┐
│    Doma     │                              │  Blockchain  │
│  Subgraph   │                              │   (Somnia)   │
│   (GraphQL) │                              │              │
└─────────────┘                              └──────────────┘
```

## Components

### 1. Data Collector (`dataCollector.js`)

**Purpose:** Fetches comprehensive domain data from Doma's Subgraph

**Responsibilities:**

- Query GraphQL API for fractional token data
- Extract domain characteristics (name, TLD, length)
- Retrieve sales history with prices and timestamps
- Calculate market capitalization
- Handle pagination for large datasets
- Manage errors and retries

**Input:** Token address (Ethereum address)

**Output:**

```javascript
{
  tokenAddress: "0x...",
  domainName: "cool.xyz",
  tld: "xyz",
  nameLength: 4,
  salesHistory: [...],
  marketCap: "10000000000000000000",
  fractionalToken: {...},
  metadata: {...}
}
```

### 2. Pricing Engine (`pricingEngine.js`)

**Purpose:** AI-powered valuation algorithm

**Scoring System:**

```
Final Score = (50% × Length Score) + (30% × TLD Score) + (20% × Sales Score)
```

**Scoring Components:**

1. **Length Score (50% weight)**

   - 1 char: 100 points (extremely rare)
   - 2 chars: 95 points (very rare)
   - 3 chars: 85 points (rare)
   - 4 chars: 75 points (premium)
   - 5 chars: 60 points (good)
   - 6-7 chars: 45 points
   - 8-10 chars: 30 points
   - 11-15 chars: 15 points
   - 16+ chars: 5 points

2. **TLD Score (30% weight)**

   - Tier 1 (.com, .io, .ai): 100 points
   - Tier 2 (.xyz, .app, .dev): 70 points
   - Tier 3 (.info, .online): 40 points
   - Tier 4 (others): 20 points

3. **Sales History Score (20% weight)**
   - Base: 20 points (for having sales)
   - +5 points per sale (max +30)
   - Price performance: up to +30 points
   - Recency bonus: up to +20 points

**Risk Adjustments:**

- No market cap: 0.7× multiplier
- No trading history: 0.8× multiplier
- Thin trading (<3 sales): 0.9× multiplier
- Stale market (>1 year): 0.85× multiplier

**Valuation Formula:**

```
Base Value = Market Cap || (Avg Price × Supply) || Score-based Fallback
Quality Multiplier = 0.5 + (Score / 100)
Final Value = Base Value × Quality Multiplier × Risk Factor
Price Per Token = Final Value / Total Supply
```

**Output:**

```javascript
{
  priceUSD18Decimals: "12500000000000000",  // 18 decimal Wei format
  breakdown: {...},                          // All calculation steps
  humanReadable: {...},                      // Formatted values
  metadata: {...}                            // Domain info
}
```

### 3. Oracle Updater (`oracleUpdater.js`)

**Purpose:** Blockchain transaction management

**Responsibilities:**

- Connect to blockchain via ethers.js
- Verify wallet permissions (isOwner)
- Check current on-chain prices
- Calculate price change percentages
- Skip insignificant updates (<1% change)
- Estimate gas costs
- Execute updateTokenValue transactions
- Wait for confirmations
- Handle errors and retries
- Rate limiting between transactions

**Smart Update Logic:**

```javascript
if (priceChange < 1%) {
  skip update;  // Save gas
} else {
  execute transaction;
  wait for confirmation;
}
```

**Transaction Flow:**

1. Get current on-chain price
2. Compare with new calculated price
3. If change < 1%, skip
4. Else, estimate gas
5. Send transaction
6. Wait for confirmation
7. Log result

### 4. Subgraph Queries (`subgraphQueries.js`)

**Purpose:** Batch token discovery

**Responsibilities:**

- Query all fractional tokens from subgraph
- Handle pagination (100 tokens per batch)
- Support different schema formats
- Return summary data
- Error handling for connectivity issues

**Output:** Array of all token addresses or summaries

### 5. Orchestrator (`orchestrator.js`)

**Purpose:** Main service coordinator

**Workflow:**

```
1. Initialize
   ├─ Connect to oracle contract
   ├─ Verify wallet permissions
   └─ Check balance

2. Update Cycle (every 5 minutes)
   │
   ├─ Step 1: Fetch Tokens
   │   └─ Query subgraph for all fractional tokens
   │
   ├─ Step 2: Process Tokens
   │   └─ For each token:
   │       ├─ Collect domain data
   │       └─ Calculate valuation
   │
   └─ Step 3: Update Oracle
       └─ Batch update prices on-chain
           ├─ Skip if price change < 1%
           ├─ Apply rate limiting (2s delay)
           └─ Log all results

3. Statistics & Monitoring
   ├─ Track success/failure rates
   ├─ Monitor gas costs
   └─ Generate reports
```

**Configuration:**

```javascript
{
  updateInterval: 300000,        // 5 minutes
  maxTokensPerRun: 50,          // Batch size
  delayBetweenUpdates: 2000,    // Rate limiting
  minPriceChangePercent: 1      // Update threshold
}
```

## Data Flow

### Complete Pipeline (Single Token)

```
Token Address
    ↓
[Data Collector]
    ↓ domain data
[Pricing Engine]
    ↓ calculated price
[Oracle Updater]
    ↓ transaction
Blockchain
```

### Time Flow

```
T=0:00    Start orchestrator
T=0:01    Fetch 50 token addresses from subgraph
T=0:05    Process token 1 → valuation calculated
T=0:06    Update oracle for token 1 → tx confirmed
T=0:08    Update oracle for token 2 → tx confirmed
...
T=2:45    Finished processing 50 tokens
T=2:45    Sleep until next cycle
T=5:00    Start next cycle
```

## Smart Contract Integration

### DomaRankOracle.sol

**Key Functions:**

```solidity
// Update single token price (owner only)
function updateTokenValue(address _tokenAddress, uint256 _price) external onlyOwner

// Read token price (public)
function getTokenValue(address _tokenAddress) external view returns (uint256)

// Storage
mapping(address => uint256) public tokenPrices;
```

**Integration with DomaLend:**

```solidity
// In DomaLend.sol
function _getCollateralizationRatio(uint256 loanId) internal view {
  if (domaRankOracleAddress != address(0) &&
      address(tokenPriceFeeds[loan.collateralAddress]) == address(0)) {
    // Use DomaRank oracle for fractional tokens
    collateralPrice = IDomaRankOracle(domaRankOracleAddress)
      .getTokenValue(loan.collateralAddress);
  } else {
    // Use Chainlink for standard tokens
    (collateralPrice, _) = _getLatestPrice(...);
  }
}
```

## Security Architecture

### Access Control

- **Oracle Owner**: Controls price updates (should be multi-sig in production)
- **Backend Wallet**: Authorized to call updateTokenValue
- **Read Access**: Public (anyone can read prices)

### Security Layers

1. **Private Key Security**: Stored in config, never committed
2. **Minimal Funds**: Only enough for gas
3. **Rate Limiting**: 2-second delays prevent spam
4. **Smart Updates**: Skip unnecessary transactions
5. **Error Recovery**: Graceful handling of failures
6. **Monitoring**: Comprehensive logging

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**: Handle 50 tokens per cycle
2. **Skip Updates**: Only update if price changed >1%
3. **Rate Limiting**: Prevent RPC overload
4. **Parallel Processing**: (Future) Process tokens concurrently
5. **Caching**: (Future) Cache subgraph results

### Gas Optimization

- Average gas per update: ~45,000
- Cost per update: ~0.0001 ETH (depending on gas price)
- Daily cost (50 tokens, 288 cycles): ~0.6 ETH
- Monthly cost: ~18 ETH (assuming all tokens updated each cycle)

**Actual costs lower due to:**

- Skip logic (most updates skipped)
- Fewer fractional tokens in practice
- Lower gas prices on Somnia

## Monitoring & Observability

### Metrics Tracked

```javascript
{
  totalRuns: 100,                    // Total update cycles
  totalTokensProcessed: 2500,        // Tokens analyzed
  totalUpdatesSuccessful: 2000,      // Successful tx
  totalUpdatesFailed: 50,            // Failed tx
  lastRunTime: "2024-01-01T12:00",  // Timestamp
  lastError: null,                   // Last error message
  isRunning: false,                  // Current status
  schedulerActive: true              // Scheduler status
}
```

### Logs

- **Info**: Cycle starts, token processing, tx confirmations
- **Warn**: Skipped updates, low balance, stale data
- **Error**: Failed transactions, network issues, invalid data

## Deployment Architectures

### Option 1: Simple VPS

```
Single server running PM2
├─ PM2 manages process
├─ Automatic restarts
└─ Log management
```

### Option 2: Container (Docker)

```
Docker container
├─ Isolated environment
├─ Easy deployment
└─ Orchestration with K8s
```

### Option 3: Serverless (Future)

```
AWS Lambda / Cloud Functions
├─ Triggered by CloudWatch
├─ Auto-scaling
└─ Pay per execution
```

## Future Enhancements

### Phase 2: Machine Learning

- Train on historical sales data
- Predict future valuations
- Sentiment analysis integration

### Phase 3: Multi-Chain

- Support multiple blockchains
- Cross-chain price aggregation
- Unified oracle interface

### Phase 4: Governance

- DAO-controlled parameters
- Community voting on algorithms
- Decentralized oracle network

### Phase 5: Advanced Features

- Real-time price updates via WebSocket
- Price prediction APIs
- Historical price charts
- Volatility metrics

## Testing Strategy

### Unit Tests

- Pricing engine calculations
- Risk adjustment logic
- Data parsing

### Integration Tests

- Subgraph connectivity
- Blockchain transactions
- End-to-end pipeline

### Load Tests

- 1000+ tokens
- Network failures
- Gas price spikes

## Conclusion

The DomaRank Oracle provides a robust, automated system for valuing fractional domain tokens. By combining AI scoring with real market data and risk adjustments, it produces conservative, auditable valuations suitable for DeFi lending protocols.

**Key Strengths:**

- ✅ Fully automated
- ✅ Transparent calculations
- ✅ Conservative valuations
- ✅ Gas optimized
- ✅ Production ready

**Production Checklist:**

- [ ] Deploy DomaRankOracle.sol
- [ ] Configure backend service
- [ ] Test all components
- [ ] Run test cycle
- [ ] Monitor first 24 hours
- [ ] Set up alerting
- [ ] Implement multi-sig
- [ ] Document operational procedures
