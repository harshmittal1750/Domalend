# Doma API Key Setup Guide

## 🔑 Why You Need an API Key

The Doma Subgraph GraphQL API requires authentication to query fractional token data. Without a valid API key, your oracle backend will not be able to fetch domain information from the Doma network.

## 📋 How to Obtain Your API Key

### Option 1: Contact Doma Team

1. **Join Doma Discord**: https://discord.gg/doma
2. **Request API Access**: Post in #developer-support or #api-access channel
3. **Provide Details**:
   - Your project name: "DreamLend Oracle Integration"
   - Use case: "Querying fractional token data for lending protocol"
   - GitHub: Your repository URL
   - Expected usage: "Querying every 10 minutes for price updates"

### Option 2: Developer Dashboard (If Available)

1. Visit: https://dashboard.doma.xyz (or equivalent)
2. Log in with your wallet
3. Navigate to "API Keys" section
4. Generate a new API key
5. Copy and save securely

### Option 3: Email Request

Send an email to: developers@doma.xyz (check official docs for correct email)

**Subject**: API Key Request - DreamLend Oracle Integration

**Body**:

```
Hi Doma Team,

I'm building a lending protocol (DreamLend) that integrates with Doma's
fractional domain tokens. I need API access to query the Subgraph for
token data to power my oracle system.

Project: DreamLend P2P Lending + DomaRank Oracle
GitHub: [your-repo]
Use Case: Automated token price updates every 10 minutes
Expected QPS: ~0.002 (1 query per 10 minutes)

Please provide an API key for testnet access.

Thank you!
```

## 🔧 Configuring Your API Key

### Step 1: Add to Environment Variables

Create or update your `.env` file:

```bash
# In backend/.env
DOMA_API_KEY=your_actual_api_key_here
```

### Step 2: Verify Configuration

Start the backend and check the logs:

```bash
cd backend
npm run backend
```

Look for this in the startup output:

```
============================================================
DOMALEND ORACLE BACKEND SYSTEM
============================================================
Status: Starting up...
Subgraph: https://api-testnet.doma.xyz/graphql
API Key: ✓ Configured  ← Should show "✓ Configured"
RPC: https://rpc-testnet.doma.xyz
Oracle: 0x1234...
============================================================
```

If you see "⚠️ Not Set" instead, your API key is not properly configured.

### Step 3: Test API Access

Test your API key with curl:

```bash
curl -X POST \
  -H "API-KEY: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { fractionalTokens(pageSize: 1) { items { id name } totalCount } }"}' \
  https://api-testnet.doma.xyz/graphql
```

**Expected Response** (if key is valid):

```json
{
  "data": {
    "fractionalTokens": {
      "items": [
        {
          "id": "...",
          "name": "..."
        }
      ],
      "totalCount": 123
    }
  }
}
```

**Error Response** (if key is invalid):

```json
{
  "errors": [
    {
      "message": "Unauthorized"
    }
  ]
}
```

## 🔒 Security Best Practices

### 1. Keep Your API Key Secret

❌ **NEVER**:

- Commit API keys to Git
- Share keys in public forums
- Include keys in screenshots
- Send keys via unsecured channels

✅ **ALWAYS**:

- Store in `.env` file (already in `.gitignore`)
- Use environment variables
- Rotate keys regularly
- Keep backup in password manager

### 2. Secure Storage

```bash
# Good: Environment variable
export DOMA_API_KEY="key_here"

# Good: .env file (not committed)
echo "DOMA_API_KEY=key_here" >> .env

# BAD: Hardcoded in source
const API_KEY = "key_here"; // ❌ NEVER DO THIS
```

### 3. Rate Limiting

The backend automatically handles rate limiting:

- Runs every 10 minutes by default
- Processes up to 100 tokens per cycle
- Includes 2-second delays between on-chain updates

## 🐛 Troubleshooting

### Issue: "API Key: ⚠️ Not Set"

**Solution**:

```bash
# Check if .env file exists
ls -la backend/.env

# Check if variable is set
cat backend/.env | grep DOMA_API_KEY

# Should show: DOMA_API_KEY=your_key
```

### Issue: "Unauthorized" or 401 Error

**Possible Causes**:

1. Invalid API key
2. Expired API key
3. Wrong header format
4. API key not activated

**Solution**:

```bash
# Verify key format
echo $DOMA_API_KEY

# Test with curl (see Step 3 above)

# If still failing, request a new key from Doma team
```

### Issue: "Cannot query field" GraphQL Error

**Cause**: Wrong query structure or API version mismatch

**Solution**:

- Update to latest backend code
- Check [NETWORK_CONFIG.md](./NETWORK_CONFIG.md) for current API schema
- Verify endpoint: `https://api-testnet.doma.xyz/graphql`

### Issue: "No fractional tokens found"

**Possible Causes**:

1. No tokens exist on testnet yet
2. API key doesn't have access to testnet data
3. Wrong network configuration

**Solution**:

```bash
# Verify you're querying testnet
echo $DOMA_SUBGRAPH_URL
# Should be: https://api-testnet.doma.xyz/graphql

# Check if any tokens exist
curl -X POST \
  -H "API-KEY: $DOMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { fractionalTokens { totalCount } }"}' \
  https://api-testnet.doma.xyz/graphql
```

## 📚 API Usage Guidelines

### Rate Limits

- **Testnet**: ~1000 requests/day (estimated)
- **Mainnet**: Contact Doma for production limits

### Query Complexity

Keep queries simple and specific:

```graphql
# Good: Only request needed fields
query {
  fractionalTokens(pageSize: 100) {
    items {
      address
      name
      currentPrice
    }
  }
}

# Avoid: Requesting unnecessary nested data
query {
  fractionalTokens {
    items {
      # ... every possible field
    }
  }
}
```

### Pagination

The oracle backend handles pagination automatically:

- Fetches 100 tokens per page
- Automatically follows `hasNextPage`
- Processes all active tokens

## 🔄 Key Rotation

Rotate your API key every 90 days:

1. Generate new key from dashboard
2. Update `.env` file
3. Restart backend service
4. Archive old key (don't delete immediately)
5. Monitor for 24 hours
6. Delete old key after confirming new one works

## 📞 Support

If you encounter issues obtaining or using your API key:

1. **Discord**: https://discord.gg/doma (#developer-support)
2. **Documentation**: https://docs.doma.xyz
3. **GitHub**: https://github.com/doma-protocol
4. **Email**: developers@doma.xyz

## ✅ Quick Checklist

Before running the oracle backend, ensure:

- [ ] API key obtained from Doma team
- [ ] Key added to `.env` file as `DOMA_API_KEY`
- [ ] `.env` file is in `.gitignore`
- [ ] Key tested with curl
- [ ] Backend shows "API Key: ✓ Configured"
- [ ] First data collection cycle successful

---

**Last Updated**: October 2025  
**Network**: Doma Testnet  
**API Endpoint**: https://api-testnet.doma.xyz/graphql  
**Authentication**: Required (API-KEY header)
