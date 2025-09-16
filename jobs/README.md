# DeFi Data Sync Jobs

Background job system for syncing DeFiLlama data to your local PostgreSQL database.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd jobs
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

### 3. Setup Database
```bash
# Run the schema file in your PostgreSQL database
psql -d your_database_name -f ../database/schema.sql
```

### 4. Run Jobs

**Start the scheduler (runs all jobs on schedule):**
```bash
npm start
```

**Run individual jobs manually:**
```bash
npm run sync:protocols  # Sync protocol data
npm run sync:pools      # Sync pool data
npm run sync:chains     # Sync chain data
npm run map:contracts   # Map contract addresses
```

**Development mode (with file watching):**
```bash
npm run dev
```

## 📊 Job Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| sync-chains | Daily 1 AM UTC | Sync blockchain data |
| sync-protocols | Daily 2 AM UTC | Sync protocol data |
| sync-pools | Daily 3 AM UTC | Sync pool data |
| map-contracts | Daily 4 AM UTC | Map contract addresses |
| create-snapshots | Daily 5 AM UTC | Create daily snapshots |
| sync-historical | Weekly Sun 6 AM | Backfill historical data |
| cleanup-old-data | Weekly Sun 7 AM | Clean up old logs |

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/defi_warehouse

# API Keys
DEFILLAMA_API_KEY=your_key_here
MORALIS_API_KEY=your_key_here
ALCHEMY_API_KEY=your_key_here

# Job Settings
MAX_CONCURRENT_JOBS=3
API_RATE_LIMIT_MS=200
LOG_LEVEL=info
```

### Job Queue Settings

- **Concurrency**: Max 3 jobs running simultaneously
- **Rate Limiting**: 200ms delay between API calls
- **Retry Logic**: 3 attempts with exponential backoff
- **Priority Levels**: immediate > high > medium > low

## 📈 Performance Metrics

**Expected Data Volume:**
- **Protocols**: ~882 records (daily updates)
- **Pools**: ~50,000+ records (daily updates)
- **Contract Mappings**: ~10,000+ mappings
- **Daily Snapshots**: ~1,000+ per day

**Sync Times:**
- Protocols: ~2-5 minutes
- Pools: ~15-30 minutes
- Contract Mapping: ~5-10 minutes
- Total: ~30-45 minutes daily

## 🗃️ Database Tables

### Core Tables
- `protocols` - DeFi protocol data
- `pools` - Liquidity pool data
- `chains` - Blockchain network data
- `contract_mappings` - DeFiLlama ID → Contract address mappings

### Time Series
- `pool_daily_snapshots` - Daily pool metrics
- `protocol_daily_snapshots` - Daily protocol metrics

### Monitoring
- `sync_jobs` - Job execution tracking

## 🔍 Contract Address Mapping

The system automatically extracts contract addresses from:

1. **Pool IDs**: Many contain Ethereum addresses
2. **Underlying Tokens**: Token contract addresses
3. **Pool Metadata**: LP tokens, factories, routers
4. **On-chain Verification**: Cross-reference with blockchain data

**Confidence Scoring:**
- 1.0 = Verified on-chain
- 0.8 = Multiple source confirmation
- 0.6 = Single reliable source
- 0.4 = Heuristic extraction
- 0.2 = Low confidence guess

## 🚨 Monitoring & Alerts

### Health Checks
```bash
# Check job status
node src/index.js status

# List available jobs
node src/index.js list

# Run specific job manually
node src/index.js run sync-protocols
```

### Log Files
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions

### Database Views
```sql
-- Recent sync status
SELECT * FROM v_sync_status;

-- Top pools with contract mappings
SELECT * FROM v_top_pools_with_contracts LIMIT 10;

-- Protocol summary
SELECT * FROM v_protocol_summary ORDER BY total_pool_tvl DESC LIMIT 10;
```

## 🛠️ Development

### Adding New Jobs

1. Create job file in `src/jobs/your-job.js`
2. Export async function with standard return format
3. Add to job configs in `src/index.js`
4. Add npm script in `package.json`

### Job Function Template
```javascript
export async function yourJob() {
  const startTime = Date.now();
  let recordsProcessed = 0;

  try {
    logger.info('🚀 Starting your job');

    // Your job logic here

    const duration = Date.now() - startTime;
    logger.info('✅ Job completed', { recordsProcessed, duration });

    return { recordsProcessed, duration };
  } catch (error) {
    logger.error('❌ Job failed:', error);
    throw error;
  }
}
```

## 🚀 Deployment

### Option 1: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
CMD ["npm", "start"]
```

### Option 2: Railway/DigitalOcean
1. Connect your GitHub repo
2. Set environment variables
3. Deploy with auto-scaling

### Option 3: Systemd Service
```ini
[Unit]
Description=DeFi Data Sync Jobs
After=network.target

[Service]
Type=simple
User=defi
WorkingDirectory=/opt/defi-jobs
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection Errors:**
- Check `DATABASE_URL` format
- Verify PostgreSQL is running
- Check network connectivity

**API Rate Limiting:**
- Increase `API_RATE_LIMIT_MS`
- Check for API key issues
- Monitor external API status

**Memory Issues:**
- Reduce batch sizes in sync jobs
- Increase Node.js heap size: `--max-old-space-size=4096`

**Slow Performance:**
- Check database indexes
- Monitor disk I/O
- Consider connection pooling

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

This will show detailed API calls, database queries, and processing stats.