# DreamLend - P2P Lending Protocol on Somnia L1

**Built for Somnia L1 Testnet** - A decentralized peer-to-peer lending protocol with oracle-based liquidations, liquidity mining rewards, and advanced risk management.

## 🎥 Demo Video

[![DreamLend Demo](https://img.youtube.com/vi/0Iou8WJnigM/maxresdefault.jpg)](https://www.youtube.com/watch?v=2e_KI3gE-Tk)

**[🎬 Watch Full Demo on YouTube](https://www.youtube.com/watch?v=2e_KI3gE-Tk)**

[![Demo](https://img.shields.io/badge/🎬_Demo-Watch_Video-red?style=flat&logo=youtube)](https://www.youtube.com/watch?v=2e_KI3gE-Tk)
[![Twitter](https://img.shields.io/badge/Twitter-@DreamlendFi-1DA1F2?style=flat&logo=twitter)](https://x.com/DreamlendFi)
[![Architecture](https://img.shields.io/badge/Architecture-Diagram-blue)](#architecture)
[![Somnia](https://img.shields.io/badge/Built%20for-Somnia%20L1-purple)](https://somnia.network)

## Why DreamLend is a Hit

- **First P2P Lending Protocol on Somnia L1** - Pioneer in decentralized lending on the fastest blockchain
- **Oracle-Powered Liquidations** - Real-time price feeds ensure fair and accurate liquidations
- **Liquidity Mining Rewards** - Earn $DREAM tokens for participating in the protocol
- **Advanced Risk Management** - Volatility-based collateral ratios and staleness protection
- **Seamless UX** - Modern interface with real-time price comparisons and transaction modals

## Features

### ✅ Current Features

- **P2P Loan Creation** - Lenders create customizable loan offers
- **Collateralized Borrowing** - Borrowers provide collateral to secure loans
- **Oracle-Based Liquidations** - DIA Oracle V2 integration for fair liquidations
- **Partial Loan Repayments** - Flexible repayment options
- **Collateral Management** - Add/remove collateral to maintain loan health
- **Liquidity Mining** - Earn $DREAM tokens for active participation
- **Real-Time Price Feeds** - Live market data for all supported tokens
- **Advanced Analytics** - Comprehensive loan and protocol statistics
- **Transaction Progress Modals** - Enhanced UX for multi-step transactions
- **Loan Health Monitoring** - Visual health indicators and risk management

### 🔄 Coming Soon

- **Orderbook Matchmaking** - Efficiently match lenders and borrowers
- **Vaults for Lenders** - Auto-compounding interest and rewards
- **Multi-collateral Loans** - Support for multiple collateral types per loan
- **Cross-chain Integration** - Bridge to other networks

## 🏗️ Architecture

![Architecture Diagram](/architecture_diagram.png)
![Flow Diagram](/flow_diagram.png)

**Fully On-Chain Protocol** - All core functionality runs on Somnia L1:

- Smart contracts handle loan creation, acceptance, and liquidations
- Oracle integration for real-time price feeds
- Reward distribution through on-chain mechanisms
- Frontend interfaces with contracts directly via ethers.js

**Off-Chain Components:**

- The Graph subgraph for efficient data indexing
- Frontend UI hosted on Vercel
- Price feed aggregation and caching

## 📱 Deployment Details

### **Somnia L1 Testnet**

- **Chain ID:** `50312`
- **RPC URL:** `https://dream-rpc.somnia.network`
- **Explorer:** `https://shannon-explorer.somnia.network/txs`
- **Somnia Homepage:** `https://somnia.network`

### **Smart Contracts**

- **DreamLend (Main):** `0xddDa4e2B1B8E6f06086F103dA6358E7aCbd020ec`
- **RewardsDistributor:** `0x1ee1E4d84636FFDb8de6Dc684475C8f2Bdf5699c`
- **DreamerToken ($DREAM):** `0xf68F7B7FD9629f4990A5AB7181C2EE0E8b496B4B`
<!-- - **SomniaConfig:** `0x[Contract Address]` -->

### **Oracle Integration**

- **DIA Oracle V2:** `0x9206296Ea3aEE3E6bdC07F7AaeF14DfCf33d865D`
- **Price Feeds:** AggregatorV3Interface-compatible adapters
- USDT_PRICE_FEED =`0x67d2C2a87A17b7267a6DBb1A59575C0E9A1D1c3e`;
- USDC_PRICE_FEED =`0x235266D5ca6f19F134421C49834C108b32C2124e`;
- BTC_PRICE_FEED =`0x4803db1ca3A1DA49c3DB991e1c390321c20e1f21`;
- ARB_PRICE_FEED =`0x74952812B6a9e4f826b2969C6D189c4425CBc19B`;
- SOL_PRICE_FEED =`0xD5Ea6C434582F827303423dA21729bEa4F87D519`;

### **Subgraph**

- **Endpoint:** [DreamLend Subgraph](https://api.subgraph.somnia.network/api/public/d5671b32-2846-489e-a577-e7d9702dd17b/subgraphs/dreamlend-graph/v0.0.3/)
- **Purpose:** Index loan events, user activities, and protocol statistics

## 🌟 Community Fit - Perfect for Somnia Users

### **Why Somnia Users Will Love DreamLend:**

1. **Lightning-Fast Transactions** - Leverages Somnia's 400k+ TPS for instant loan operations
2. **Ultra-Low Fees** - Minimal gas costs make micro-lending profitable
3. **Real-Time Experience** - Sub-second confirmations for seamless UX
4. **Native Integration** - Built specifically for Somnia's architecture
5. **Earn While You Lend** - Liquidity mining rewards in $DREAM tokens

### **Perfect Use Cases:**

- **DeFi Traders** - Quick capital for trading opportunities
- **Yield Farmers** - Leverage positions without selling holdings
- **Liquidity Providers** - Earn additional yield on idle assets
- **Risk Managers** - Advanced tools for portfolio optimization

## 🚀 How to Use DreamLend

### **For Lenders:**

1. **Connect Wallet** - Use any Somnia-compatible wallet
2. **Create Loan Offer** - Set amount, interest rate, duration, and collateral requirements
3. **Earn Interest** - Receive payments as borrowers repay loans
4. **Earn Rewards** - Accumulate $DREAM tokens through liquidity mining

### **For Borrowers:**

1. **Browse Offers** - View available loans with real-time pricing
2. **Provide Collateral** - Deposit required collateral tokens
3. **Accept Loan** - Receive loan tokens instantly
4. **Manage Health** - Monitor loan health and add collateral as needed
5. **Repay Flexibly** - Make partial or full repayments anytime

### **For Liquidators:**

1. **Monitor Loans** - Track unhealthy loans approaching liquidation
2. **Execute Liquidations** - Liquidate defaulted loans for profit
3. **Earn Rewards** - Receive liquidation bonuses and $DREAM tokens

## 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/harshmittal1750/dreamlend
cd dreamlend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Reown Project ID and other config

# Start development server
npm run dev
```

### **Smart Contract Development**

```bash
cd contracts
forge build
forge test
forge script script/Deploy.s.sol --rpc-url $SOMNIA_RPC_URL --broadcast
```

## Pitch Deck

[![Pitch Deck](https://img.shields.io/badge/📄_Pitch_Deck-View_Document-blue?style=flat&logo=google-drive)](./dreamlendfinance-Somnia-hackathon.pdf)

## 🔗 Links

- **Website:** [dreamlend.finance](https://www.dreamlend.finance/)
- **Twitter:** [@DreamlendFi](https://x.com/DreamlendFi)
- **Documentation:** [docs.dreamlend.finance](https://docs.dreamlend.finance)
- **Somnia Network:** [somnia.network](https://somnia.network)

## 📊 Onchain Impact

**100% Core Functionality On-Chain:**

- ✅ Loan creation and management
- ✅ Collateral handling and liquidations
- ✅ Interest calculations and payments
- ✅ Reward distribution
- ✅ Oracle price integration
- ✅ Risk parameter enforcement

**Off-Chain Support Services:**

- 📊 Data indexing via The Graph
- 🖥️ Frontend interface
- 📈 Analytics and monitoring

**Result:** A truly decentralized lending protocol where users maintain full custody and control of their assets while benefiting from automated, trustless loan management.

---

_Built with ❤️ for the Somnia ecosystem - Empowering decentralized finance through lightning-fast, low-cost P2P lending._
