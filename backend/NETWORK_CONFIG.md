# Network Configuration - Doma Integration

## Doma Testnet Details

### Network Information

| Parameter          | Value                             |
| ------------------ | --------------------------------- |
| **Network Name**   | Doma Testnet                      |
| **Chain ID**       | 97476                             |
| **Currency**       | ETH                               |
| **RPC URL**        | https://rpc-testnet.doma.xyz      |
| **Block Explorer** | https://explorer-testnet.doma.xyz |
| **Bridge**         | https://bridge-testnet.doma.xyz   |

### API Endpoints

| Service                | Endpoint                             |
| ---------------------- | ------------------------------------ |
| **Doma API**           | https://api-testnet.doma.xyz         |
| **Subgraph (GraphQL)** | https://api-testnet.doma.xyz/graphql |

**⚠️ Authentication Required**: The Doma Subgraph API requires an API key for authentication. Contact the Doma team or access your dashboard to obtain an API key.

## Deployed Smart Contracts

### Doma Testnet (Chain ID: 97476)

| Contract                | Address                                      |
| ----------------------- | -------------------------------------------- |
| **Doma Record**         | `0xF6A92E0f8bEa4174297B0219d9d47fEe335f84f8` |
| **Proxy Doma Record**   | `0xb1508299A01c02aC3B70c7A8B0B07105aaB29E99` |
| **Ownership Token**     | `0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f` |
| **Cross Chain Gateway** | `0xCE1476C791ff195e462632bf9Eb22f3d3cA07388` |
| **Forwarder**           | `0xf17beC16794e018E2F0453a1282c3DA3d121f410` |

### Sepolia Testnet (Chain ID: 11155111)

| Contract                | Address                                      |
| ----------------------- | -------------------------------------------- |
| **Ownership Token**     | `0x9A374915648f1352827fFbf0A7bB5752b6995eB7` |
| **Proxy Doma Record**   | `0xD9A0E86AACf2B01013728fcCa9F00093B9b4F3Ff` |
| **Cross Chain Gateway** | `0xEC67EfB227218CCc3c7032a6507339E7B4D623Ad` |

### Base Sepolia Testnet (Chain ID: 84532)

| Contract                | Address                                      |
| ----------------------- | -------------------------------------------- |
| **Ownership Token**     | `0x2f45DfC5f4c9473fa72aBdFbd223d0979B265046` |
| **Proxy Doma Record**   | `0xa40aA710F0C77DF3De6CEe7493d1FfF3715D59Da` |
| **Cross Chain Gateway** | `0xC721925DF8268B1d4a1673D481eB446B3EDaAAdE` |

### Shibarium (Puppynet) Testnet (Chain ID: 157)

| Contract                | Address                                      |
| ----------------------- | -------------------------------------------- |
| **Ownership Token**     | `0x55460792B2e3eDEbdF28f6C8766B7778Db7092A9` |
| **Proxy Doma Record**   | `0x8420729Dc9eBb5a30dBa8CEe1392F56bfc03b1F5` |
| **Cross Chain Gateway** | `0x79e70acd155bFA071E57cA6a2f507d87d0e7B7f9` |

### Apechain Testnet (Chain ID: 33111)

| Contract                | Address                                      |
| ----------------------- | -------------------------------------------- |
| **Ownership Token**     | `0x63b7749B3b79B974904E0c684Ee589191fd807b4` |
| **Proxy Doma Record**   | `0x797293E811f9C5eFa1973004B581E46d1787F929` |
| **Cross Chain Gateway** | `0xa483D7d32D7f5f2bd430CA9e61db275Eda72Fd23` |

## Configuration for Oracle Backend

### Getting Started

#### 1. Obtain Doma API Key

The Doma Subgraph API requires authentication. To get your API key:

1. **Contact Doma Team**: Reach out via Discord or official channels
2. **Dashboard Access**: Log in to your Doma developer dashboard (if available)
3. **Request Access**: Provide your use case and project details

**API Key Format**: `API-KEY: your_api_key_here`

#### 2. Set Up Environment Variables

```bash
# Doma Testnet Configuration
DOMA_CHAIN_ID=97476
RPC_URL=https://rpc-testnet.doma.xyz
DOMA_SUBGRAPH_URL=https://api-testnet.doma.xyz/graphql
DOMA_API_URL=https://api-testnet.doma.xyz

# Doma API Key (REQUIRED)
DOMA_API_KEY=your_api_key_here

# Doma Contract Addresses
DOMA_RECORD_ADDRESS=0xF6A92E0f8bEa4174297B0219d9d47fEe335f84f8
DOMA_OWNERSHIP_TOKEN_ADDRESS=0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f
DOMA_PROXY_RECORD_ADDRESS=0xb1508299A01c02aC3B70c7A8B0B07105aaB29E99

# Your Deployed Contracts (to be filled)
DOMA_RANK_ORACLE_ADDRESS=
DREAM_LEND_ADDRESS=

# Oracle Updater
ORACLE_UPDATER_PRIVATE_KEY=
```

### Adding Doma Testnet to MetaMask

1. Open MetaMask and click on the network dropdown
2. Select "Add Network" → "Add a network manually"
3. Fill in the following details:

```
Network Name: Doma Testnet
New RPC URL: https://rpc-testnet.doma.xyz
Chain ID: 97476
Currency Symbol: ETH
Block Explorer URL: https://explorer-testnet.doma.xyz
```

4. Click "Save" and switch to the Doma Testnet

## Integration Guide

### 1. Querying Fractional Tokens

Use the Subgraph endpoint to query fractional domain tokens:

```javascript
import { GraphQLClient, gql } from "graphql-request";

const client = new GraphQLClient("https://api-testnet.doma.xyz/graphql");

const query = gql`
  query GetFractionalTokens {
    fractionalTokens(first: 10) {
      id
      totalSupply
      currentPrice
      domain {
        name
        tld
        length
      }
    }
  }
`;

const data = await client.request(query);
```

### 2. Checking Domain Ownership

Use the Ownership Token contract to verify domain ownership and lock status:

```solidity
// In your smart contract
address constant DOMA_OWNERSHIP_TOKEN = 0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f;

IDomaOwnershipToken ownershipToken = IDomaOwnershipToken(DOMA_OWNERSHIP_TOKEN);
bool isLocked = ownershipToken.lockStatusOf(domainTokenId);
```

### 3. Cross-Chain Integration

For cross-chain operations, use the Cross Chain Gateway:

```
Doma Testnet Gateway: 0xCE1476C791ff195e462632bf9Eb22f3d3cA07388
```

## DomaLend Deployment

### Deployment Steps on Doma Testnet

1. **Set up your environment:**

```bash
cd contracts
cp .env.example .env
# Edit .env with Doma testnet RPC and private key
```

2. **Deploy DomaRankOracle:**

```bash
forge create src/DomaRankOracle.sol:DomaRankOracle \
  --rpc-url https://rpc-testnet.doma.xyz \
  --private-key $PRIVATE_KEY
```

3. **Deploy DomaLend:**

```bash
forge create src/DomaLend.sol:DomaLend \
  --rpc-url https://rpc-testnet.doma.xyz \
  --private-key $PRIVATE_KEY
```

4. **Set DomaRank Oracle in DomaLend:**

```bash
cast send $DREAM_LEND_ADDRESS \
  "setDomaRankOracle(address)" $DOMA_RANK_ORACLE_ADDRESS \
  --rpc-url https://rpc-testnet.doma.xyz \
  --private-key $PRIVATE_KEY
```

5. **Verify contracts on explorer:**

```bash
# Visit https://explorer-testnet.doma.xyz
# Use "Verify & Publish" feature
```

## Testing Your Integration

### 1. Get Test ETH

Use the Doma testnet faucet or bridge:

- Bridge: https://bridge-testnet.doma.xyz
- Bridge ETH from Sepolia or other supported testnets

### 2. Interact with Doma Contracts

```javascript
// Example: Get domain info
const domaRecord = new ethers.Contract(
  "0xF6A92E0f8bEa4174297B0219d9d47fEe335f84f8",
  DOMA_RECORD_ABI,
  provider
);

const domainInfo = await domaRecord.getDomainInfo("example.xyz");
```

### 3. Test Oracle Updates

```bash
cd backend
npm run test-oracle
```

## Useful Links

- **Documentation**: https://docs.doma.xyz
- **Discord**: https://discord.gg/doma
- **GitHub**: https://github.com/doma-protocol
- **Twitter**: https://twitter.com/domaprotocol

## Troubleshooting

### Common Issues

**1. Transaction Fails on Doma Testnet**

- Ensure you have enough ETH for gas
- Check that you're connected to the correct network (Chain ID: 97476)
- Verify contract addresses are correct

**2. Subgraph Not Returning Data**

- Endpoint: https://api-testnet.doma.xyz/graphql
- Check if query syntax is correct
- Verify network connectivity

**3. RPC Connection Issues**

- Primary RPC: https://rpc-testnet.doma.xyz
- Check if RPC is responding: `curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' https://rpc-testnet.doma.xyz`

**4. Contract Verification Fails**

- Use Doma's block explorer: https://explorer-testnet.doma.xyz
- Ensure compiler version matches deployment
- Include all constructor arguments

## Security Notes

- These are TESTNET addresses - do not use on mainnet
- Never share private keys or seed phrases
- Always verify contract addresses before interacting
- Test thoroughly before deploying to production

## Contact & Support

For issues or questions about Doma integration:

- Open an issue on GitHub
- Ask in the Doma Discord
- Check the official documentation

---

**Last Updated**: Based on current Doma Testnet deployment
**Chain ID**: 97476
**Network Status**: Active
