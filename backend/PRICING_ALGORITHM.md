# DomaRank AI Scoring Engine - Technical Documentation

## Overview

The DomaRank AI Scoring Engine is a sophisticated valuation system for fractional domain name tokens (NFTs). It combines multiple data points to produce risk-adjusted USD valuations with 18 decimal precision, suitable for on-chain oracle updates.

## Architecture

```
Data Collection → AI Scoring → Risk Adjustment → Final Valuation (18 decimals)
```

## Core Components

### 1. Data Collection (`dataCollector.js`)

**Input:** Fractional token address  
**Output:** Comprehensive domain data

**Collected Data:**

- Domain name and TLD
- Name length (without TLD)
- Sales history (prices, dates, participants)
- Market capitalization
- Fractional token supply and price

**GraphQL Integration:**

- Queries Doma's Subgraph API
- Supports multiple schema formats
- Handles errors gracefully

### 2. AI Scoring Engine (`pricingEngine.js`)

#### Scoring Algorithm

The engine uses a **weighted scoring system** with three primary factors:

```
Final Score = (50% × Length Score) + (30% × TLD Score) + (20% × Sales Score)
```

#### Component Scores (0-100 scale)

##### Length Score

Shorter domains are more valuable:

- 1 character: 100 points (extremely rare)
- 2 characters: 95 points (very rare)
- 3 characters: 85 points (rare)
- 4 characters: 75 points (premium)
- 5 characters: 60 points (good)
- 6-7 characters: 45 points (decent)
- 8-10 characters: 30 points (average)
- 11-15 characters: 15 points (below average)
- 16+ characters: 5 points (low value)

##### TLD Score

Based on popularity and market perception:

**Tier 1 (100 points):** .com, .net, .org, .io, .ai  
Premium TLDs with established market value

**Tier 2 (70 points):** .xyz, .co, .app, .dev, .tech  
Popular modern TLDs with growing adoption

**Tier 3 (40 points):** .info, .online, .site, .store, .blog  
Common TLDs with moderate demand

**Tier 4 (20 points):** All others  
Less popular or niche TLDs

##### Sales History Score

Evaluates trading activity and price performance:

- **Base Score:** 20 points for having any sales history
- **Volume Factor:** +5 points per sale (max +30)
- **Price Factor:** Higher average prices add up to +30 points
- **Recency Bonus:** Recent activity adds up to +20 points
  - Last 30 days: +20 points
  - Last 90 days: +15 points
  - Last 180 days: +10 points
  - Last 365 days: +5 points

**No Sales History:** Minimum 10 points

#### Risk Adjustment

Conservative multipliers to account for market uncertainty:

```javascript
Risk Factor = Base (1.0) × Market Cap Penalty × Liquidity Penalty × Activity Penalty
```

**Market Cap Penalties:**

- No market cap data: 0.7× (30% discount)
- Market cap available: 1.0× (no discount)

**Liquidity Penalties:**

- No sales history: 0.8× (20% discount)
- 1-2 sales: 0.9× (10% discount)
- 3+ sales: 1.0× (no discount)

**Activity Penalties:**

- Last sale >1 year ago: 0.85× (15% discount)
- Recent activity: 1.0× (no discount)

**Final Risk Factor Range:** 0.5× to 1.0×

### 3. Valuation Calculation

#### Step-by-Step Process

**Step 1: Calculate Domain Quality Score**

```
Domain Score = (50 × Length Score + 30 × TLD Score + 20 × Sales Score) / 100
Result: 0-100
```

**Step 2: Determine Base Valuation**

Priority order:

1. **Market Cap** (if available): Use current market capitalization
2. **Average Sale Price** × Estimated Supply (if sales exist)
3. **Score-Based Fallback**: 1 ETH × (Domain Score / 100)

**Step 3: Apply Quality Multiplier**

```
Quality Multiplier = 0.5 + (Domain Score / 100)
Range: 0.5× to 1.5×
```

High-quality domains get a premium, low-quality domains get discounted.

**Step 4: Apply Risk Adjustment**

```
Risk Factor = calculated as above
Range: 0.5× to 1.0×
```

**Step 5: Calculate Final Valuation**

```
Final Valuation = Base Value × Quality Multiplier × Risk Factor
```

**Step 6: Calculate Per-Token Price**

```
Price Per Token = Final Valuation / Total Supply
Result: 18-decimal integer (Wei format)
```

## Example Calculation

### Input Data

```javascript
{
  domainName: "cool.xyz",
  tld: "xyz",
  nameLength: 4,
  marketCap: "10000000000000000000",  // 10 ETH
  fractionalToken: {
    totalSupply: "1000",
  },
  salesHistory: [
    { price: "500000000000000000", timestamp: 30_days_ago },
    { price: "750000000000000000", timestamp: 60_days_ago }
  ]
}
```

### Scoring Process

**Length Score:** 4 characters → **75 points**

**TLD Score:** .xyz (Tier 2) → **70 points**

**Sales Score:**

- Base: 20 points
- Volume: 2 sales × 5 = 10 points
- Avg price: 0.625 ETH × 10 = 6.25 points
- Recency: Last sale 30 days ago = 20 points
- **Total: 56.25 points**

**Domain Score:**

```
(50 × 75 + 30 × 70 + 20 × 56.25) / 100 = 68.625
```

**Quality Multiplier:**

```
0.5 + 68.625/100 = 1.186
```

**Risk Factor:**

- Market cap exists: 1.0
- Has 2 sales: 0.9
- Recent activity: 1.0
- **Total: 0.9**

**Final Calculation:**

```
Base Value: 10 ETH
× Quality: 1.186
× Risk: 0.9
= 10.674 ETH total valuation

Per Token: 10.674 ETH / 1000 tokens = 0.010674 ETH
In Wei: 10,674,000,000,000,000 (18 decimals)
```

## Output Format

```javascript
{
  priceUSD18Decimals: "10674000000000000",  // Ready for oracle
  breakdown: { /* detailed scores */ },
  humanReadable: { /* formatted values */ },
  metadata: { /* domain info */ }
}
```

## Key Features

### Transparency

Every calculation is broken down and returned in the output, making the valuation auditable and explainable.

### Conservative Approach

Multiple risk adjustments ensure valuations are conservative, protecting lenders from overvaluation.

### Market-Aware

Uses actual market data (market cap, sales) when available, falling back to score-based estimates only when necessary.

### Scalable

Can process multiple tokens in parallel, suitable for batch oracle updates.

## Usage in Oracle Updates

The `priceUSD18Decimals` value can be directly used in oracle updates:

```javascript
const valuation = calculateDomaValue(domainData);
const priceForOracle = valuation.priceUSD18Decimals;

// Update on-chain oracle
await domaRankOracle.updateTokenValue(tokenAddress, priceForOracle);
```

## Future Enhancements

Potential improvements to the algorithm:

1. **Machine Learning Integration:** Train on historical sales data
2. **Market Sentiment:** Incorporate social metrics and search trends
3. **Volatility Adjustment:** Dynamic risk factors based on price volatility
4. **Comparative Analysis:** Compare similar domains for relative pricing
5. **Time Decay:** Gradual adjustment for domains without recent activity
6. **External Price Feeds:** Integrate with domain marketplace APIs

## Testing

```bash
# Test with mock data
npm run test-pricing

# Test with live data
npm run test-pricing live 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

## Security Considerations

- All calculations are deterministic and reproducible
- Input validation prevents manipulation
- Risk factors provide conservative estimates
- Suitable for production use with proper monitoring
