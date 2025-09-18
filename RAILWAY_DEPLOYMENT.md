# 🚂 Railway Deployment Guide

Complete guide to deploy your DeFi background jobs on Railway.

## 📋 Overview

Your background jobs system is now ready for Railway deployment with:
- ✅ **Supabase Integration**: Uses Supabase REST API (no direct PostgreSQL connection needed)
- ✅ **Tested Locally**: Successfully synced 3,853 pools
- ✅ **Railway Configuration**: Optimized `railway.json` file
- ✅ **Environment Variables**: Pre-configured for production

## 🛠️ Deployment Steps

### Step 1: Railway Account Setup

1. **Go to Railway**
   ```
   https://railway.app
   ```

2. **Connect GitHub Account**
   - Click "Login with GitHub"
   - Authorize Railway to access your repositories

### Step 2: Deploy from GitHub

1. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `/jobs` folder as the root directory

2. **Configure Environment Variables**
   ```bash
   # Required Supabase variables
   SUPABASE_URL=https://vhbpykvhcmwvoqgosqle.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYnB5a3ZoY213dm9xZ29zcWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNTcwMjksImV4cCI6MjA3MzYzMzAyOX0.g7QLVjZRFjhLAahAReQcmuR9b7fHcS9j94jswNB5t0E

   # DeFiLlama API
   DEFILLAMA_API_KEY=a4681a197fa00a94158d5abe1a368a8b9d80c912d8130deba311da42dde0f339

   # Job configuration
   NODE_ENV=production
   LOG_LEVEL=info
   MAX_CONCURRENT_JOBS=3
   API_RATE_LIMIT_MS=200

   # Fallback PostgreSQL (optional - jobs use Supabase REST API)
   DATABASE_URL=postgresql://postgres:4BkM7qRknPZkvhlx@db.vhbpykvhcmwvoqgosqle.supabase.co:5432/postgres
   ```

3. **Deploy**
   - Railway will automatically detect `railway.json`
   - It will run `npm install` and `npm start`
   - Monitor deployment logs

### Step 3: Verify Deployment

1. **Check Logs**
   ```
   ✅ Expected startup sequence:
   🚀 Initializing Supabase Job Scheduler...
   ✅ Supabase connection verified
   📝 Scheduler startup logged
   📅 Setting up cron schedules...
   ▶️ Starting job scheduler...
   🟢 Started job: pools-sync
   ✨ Job scheduler is now running
   🎯 Scheduler is ready!
   ```

2. **Verify Database Updates**
   - Jobs will create entries in `sync_jobs` table
   - Check your Supabase dashboard for activity
   - Pool sync runs daily at 2 AM UTC

## 📊 Job Schedule

- **Pools Sync**: Daily at 2:00 AM UTC
- **Status Logging**: Every hour
- **Auto-restart**: On failure (max 3 retries)

## 🔧 Manual Operations

### Test Connection
```bash
npm run test:connection
```

### Manual Pool Sync
```bash
npm run sync:pools
```

### View Logs
```bash
# In Railway dashboard
# Go to your project → Deployments → View Logs
```

## 📈 Monitoring

### Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: History and rollback options

### Supabase Dashboard
```sql
-- Check recent sync jobs
SELECT * FROM sync_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Pool counts by chain
SELECT chain, COUNT(*) as pools, SUM(tvl_usd) as total_tvl
FROM pools
GROUP BY chain
ORDER BY total_tvl DESC;
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Errors**
   ```
   Error: Missing Supabase configuration
   ```
   **Solution**: Verify SUPABASE_URL and SUPABASE_ANON_KEY are set

2. **Build Failures**
   ```
   npm install failed
   ```
   **Solution**: Check `package.json` is valid and Node.js version is 18+

3. **Job Failures**
   ```
   Supabase error: unauthorized
   ```
   **Solution**: Verify API key and check Supabase project is active

### Debug Commands

```bash
# Test Supabase connection
node simple-test.js

# Run single sync job
node src/jobs/supabase-sync-pools.js

# Check environment
node -e "console.log(process.env.SUPABASE_URL)"
```

## 💰 Cost Estimation

### Railway Pricing
- **Hobby Plan**: $5/month
  - 500 hours runtime
  - 1GB RAM, 1 vCPU
  - Perfect for background jobs

- **Pro Plan**: $20/month
  - Unlimited runtime
  - More resources
  - Production workloads

### Expected Usage
- **Runtime**: ~720 hours/month (always-on)
- **Memory**: ~100-200MB average
- **CPU**: Low (spikes during sync jobs)

## 🎯 Next Steps

1. **Deploy to Railway** following steps above
2. **Monitor first sync job** (runs within 5 seconds in dev mode)
3. **Set up alerts** in Railway dashboard
4. **Scale resources** if needed based on usage

## 📞 Support

- **Railway**: [railway.app/help](https://railway.app/help)
- **Supabase**: [supabase.com/support](https://supabase.com/support)
- **Project Issues**: Check deployment logs first

---

Your DeFi data warehouse is now ready for production! 🚀

The background jobs will keep your database updated with the latest pool data, providing lightning-fast responses to your dashboard users.