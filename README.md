# DeFi Liquidity Pool Dashboard

A comprehensive Next.js application for analyzing liquidity pools across multiple blockchains using the DefiLlama API. Built following data engineering best practices for high-quality DeFi analytics.

## Features

### 🎯 Core Functionality
- **Multi-Chain Pool Analysis**: Support for Ethereum, Solana, Polygon, Base, and more
- **Historical Data Visualization**: Interactive charts with multiple metrics (TVL, APY, Volume, Fees)
- **Data Quality Validation**: Automated scoring system ensuring reliable data (80+ quality score required)
- **Universal Identifiers**: Contract-address-based pool identification for cross-source compatibility
- **Real-time Caching**: 15-minute cached data with SWR revalidation for optimal performance

### 📊 Data Quality Standards
Following the comprehensive data best practices guide:
- **Freshness Requirements**: Maximum 7 days staleness
- **Completeness Checks**: Minimum 30 consecutive data points
- **Consistency Validation**: Outlier detection and filtering
- **Multi-Source Augmentation**: DefiLlama + protocol-specific APIs
- **Provenance Tracking**: Full metadata and source documentation

### 🔧 Technical Architecture
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts with interactive features
- **API Integration**: Rate-limited DefiLlama API client
- **Data Validation**: Zero-tolerance quality pipeline
- **Deployment**: Vercel-ready configuration

## Quick Start

### Prerequisites
- Node.js 18+
- DefiLlama API key

### Installation

1. **Clone and setup**
   ```bash
   git clone <your-repo>
   cd llamaDashboard
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your DefiLlama API key
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Application**
   Visit [http://localhost:3000](http://localhost:3000)

## API Integration

### DefiLlama API Client Features
- **Rate Limiting**: 200ms delays between requests
- **Exponential Backoff**: Automatic retry with increasing delays
- **Caching Strategy**: 15-minute TTL with memory cache
- **Error Handling**: Comprehensive error recovery and logging
- **Data Transformation**: Standardized pool data format

### Quality Validation Pipeline
```typescript
// Automatic validation for all pool data
{
  score: 94,           // Out of 100
  issues: [],          // Any quality problems
  passed: true,        // Meets 80+ threshold
  freshness: 60/60,    // Data recency score
  completeness: 20/20, // Gap-free timeseries
  consistency: 10/10,  // No extreme outliers
  metadata: 10/10      // Complete provenance
}
```

## Data Structure

### Universal Pool Format
```typescript
interface PoolData {
  // Universal identifier (blockchain:contract_address)
  universal_id: string;
  contract_address: string;
  blockchain: 'solana' | 'ethereum' | 'polygon' | 'base';
  
  // Core metrics
  pool_name: string;
  protocol: string;
  timeseries: PoolTimeseriesPoint[];
  
  // Quality & validation
  data_quality_score: number;
  validation_passed: boolean;
  data_sources: string[];
  
  // Real-time augmentation
  orca_augmentation?: {
    orca_metrics: {
      apy_24h: number;
      current_liquidity: number;
      volume_24h: number;
    };
    augmented_at: string;
  };
}
```

## Development Workflow

### Following Best Practices Guide
1. **Start Small**: Test with 1-3 pools before full dataset
2. **Validate Early**: Check data quality at each step
3. **User Testing**: Validate with real workflows
4. **Progressive Enhancement**: Add features incrementally
5. **Document Everything**: Comprehensive metadata tracking

### Quality Gates
- All pools must achieve 80+ quality score
- Zero data gaps in timeseries
- Maximum 7 days staleness
- Valid contract addresses required
- Multi-source validation when possible

## Deployment

### Vercel Deployment
The application is configured for seamless Vercel deployment:

1. **Connect Repository**: Link to your Vercel account
2. **Environment Variables**: Add `NEXT_PUBLIC_DEFILLAMA_API_KEY`
3. **Deploy**: Automatic deployment on push

### Environment Variables
```bash
NEXT_PUBLIC_DEFILLAMA_API_KEY=your_api_key_here
```

## Performance Optimizations

### Caching Strategy
- **API Responses**: 15-minute memory cache
- **Rate Limiting**: 200ms between requests
- **SWR Pattern**: Stale-while-revalidate for real-time updates

### Bundle Optimization
- **Tree Shaking**: Automatic dead code elimination  
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: Next.js automatic optimization

## Troubleshooting

### Common Issues

**API Rate Limiting**
- Automatic exponential backoff implemented
- 200ms delays between requests
- Check console for rate limit warnings

**Data Quality Issues**
- Use dev tools: `window.debugDefiLlama.checkDataQuality(poolData)`
- Check quality score requirements (80+ minimum)
- Verify data freshness (7 days maximum)

**Missing Pool Data**
- Verify contract address format
- Check blockchain identifier
- Confirm DefiLlama API coverage

## Development Tools

### Debug Console Commands
```javascript
// Check pool data quality
window.debugDefiLlama.checkDataQuality(poolData);

// Show aggregated statistics  
window.debugDefiLlama.showPoolStats(pools);
```

### Data Quality Dashboard
- Real-time quality scoring
- Validation pipeline status
- Source attribution tracking
- Error rate monitoring

## Contributing

### Code Style
- TypeScript strict mode enabled
- Comprehensive error handling required
- Data validation at all API boundaries
- Metadata tracking for all transformations

### Testing Strategy
- Start with small datasets (1-3 pools)
- Validate with real user workflows
- Test all quality score thresholds
- Verify cross-chain compatibility

## License

MIT License - See LICENSE file for details

## Support

For issues related to:
- **Data Quality**: Check validation pipeline and best practices guide
- **API Integration**: Verify rate limiting and error handling
- **Performance**: Review caching strategy and optimization guide
- **Deployment**: Confirm Vercel configuration and environment variables
