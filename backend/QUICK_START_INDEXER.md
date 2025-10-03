# 🚀 Quick Start: DomaLend Indexer

## What is this?

A custom blockchain indexer that replaces The Graph subgraph. It indexes your DomaLend loan events and serves them via an API that's **100% compatible** with your existing frontend code - no frontend changes needed!

## ⚡ 5-Minute Setup

### Step 1: Add Environment Variables

Add these to your `backend/.env`:

```bash
# Your deployed DomaLend contract address (REQUIRED)
DREAM_LEND_CONTRACT_ADDRESS=0xYourContractAddressHere

# Blockchain RPC (REQUIRED)
SOMNIA_RPC_URL=https://rpc-testnet.doma.xyz

# Optional settings (use defaults if unsure)
INDEXER_START_BLOCK=0
INDEXER_POLL_INTERVAL=5000
INDEXER_PORT=3001
INDEXER_CORS_ORIGIN=*
```

### Step 2: Install Dependencies

```bash
cd backend
npm install
```

### Step 3: Build Contracts (if not done yet)

```bash
cd ../contracts
forge build
cd ../backend
```

### Step 4: Start the Indexer

```bash
npm run indexer
```

You should see:

```
============================================================
📡 INDEXER SERVER STARTED
============================================================
Port: 3001
Health: http://localhost:3001/health
GraphQL: http://localhost:3001/graphql
REST API: http://localhost:3001/api/*
============================================================
```

### Step 5: Test It Works

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{
  "status": "ok",
  "indexer": {
    "isIndexing": true,
    "currentBlock": 12345,
    "totalLoansIndexed": 0
  }
}
```

### Step 6: Update Frontend (2 options)

#### Option A: Update API Route (Recommended)

Edit `src/app/api/subgraph/route.ts`:

```typescript
// Change this line:
const SUBGRAPH_URL = process.env.SUBGRAPH_URL || "OLD_SUBGRAPH_URL";

// To this:
const SUBGRAPH_URL =
  process.env.SUBGRAPH_URL || "http://localhost:3001/graphql";
```

#### Option B: Use Environment Variable

Create/edit `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:3001/graphql
```

Then update your API route to use it:

```typescript
const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL || process.env.SUBGRAPH_URL;
```

### Step 7: Restart Frontend

```bash
cd frontend
npm run dev
```

## ✅ Verify It's Working

1. **Backend**: Indexer logs should show:

   ```
   📚 Syncing historical events from block 0 to 12345...
   ✓ Historical sync complete. Processed X loan creations
   ```

2. **Frontend**: Open your app and check:

   - `/offers` page loads loan offers
   - `/my-loans` shows your loans
   - No console errors about subgraph

3. **API Test**: Try a GraphQL query:
   ```bash
   curl -X POST http://localhost:3001/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "query { loanCreateds(first: 5) { id loanId amount } }"}'
   ```

## 🎯 What's Next?

### Development Workflow

Run both services during development:

**Terminal 1 - Backend Indexer:**

```bash
cd backend
npm run indexer:dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

**Terminal 3 - Oracle (optional):**

```bash
cd backend
npm run backend:dev
```

### Production Deployment

#### Deploy Indexer to VPS/Cloud

1. **Copy files to server**:

   ```bash
   scp -r backend user@server:/app/backend
   ```

2. **Install PM2**:

   ```bash
   npm install -g pm2
   ```

3. **Start with PM2**:

   ```bash
   cd /app/backend
   pm2 start src/indexer/index.js --name dreamlend-indexer
   pm2 startup
   pm2 save
   ```

4. **Setup nginx reverse proxy**:

   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
       }
   }
   ```

5. **Update frontend env**:
   ```bash
   # In Vercel/hosting dashboard
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.yourdomain.com/graphql
   ```

## 🐛 Troubleshooting

### Problem: "Contract address not set"

**Solution**: Add `DREAM_LEND_CONTRACT_ADDRESS` to your `.env` file

### Problem: "No events indexed"

**Solutions**:

1. Make sure contract has events (create a test loan)
2. Check start block: `INDEXER_START_BLOCK=0`
3. Wait a few seconds for indexer to catch up

### Problem: "Frontend shows no data"

**Solutions**:

1. Check indexer is running: `curl http://localhost:3001/health`
2. Verify frontend API URL matches indexer port
3. Check browser console for CORS errors
4. Set `INDEXER_CORS_ORIGIN=*` for development

### Problem: "ABI not found"

**Solution**: Build contracts first:

```bash
cd contracts
forge build
cd ../backend
npm run indexer
```

## 📚 Learn More

- **Full Documentation**: See `INDEXER_GUIDE.md`
- **API Reference**: See `INDEXER_GUIDE.md#api-reference`
- **Architecture**: See `INDEXER_GUIDE.md#architecture`

## 🎉 Success Checklist

- [ ] Environment variables set in `backend/.env`
- [ ] Dependencies installed (`npm install`)
- [ ] Contracts compiled (`forge build`)
- [ ] Indexer running (`npm run indexer`)
- [ ] Health check passes (`curl http://localhost:3001/health`)
- [ ] Frontend API updated to point to indexer
- [ ] Frontend loads data correctly
- [ ] Can create and view loans

## 💡 Tips

1. **Development**: Use `npm run indexer:dev` for auto-restart on code changes
2. **Monitoring**: Keep an eye on indexer logs - they show all indexed events
3. **Performance**: Indexer polls every 5 seconds by default - adjust `INDEXER_POLL_INTERVAL` if needed
4. **Database**: For production, consider adding PostgreSQL instead of in-memory storage

## 🆘 Need Help?

If you're stuck:

1. Check the logs - the indexer is very verbose
2. Test the API directly with `curl`
3. Verify your contract address is correct
4. Make sure the RPC URL works: `curl $SOMNIA_RPC_URL`
5. Check `INDEXER_GUIDE.md` for detailed troubleshooting

---

**That's it! Your indexer should now be running and serving loan data to your frontend.** 🚀
