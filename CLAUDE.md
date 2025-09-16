# Claude Development Notes

## Environment Variables

The project uses environment variables stored in `.env.local` file. The following variables are configured:
- `DEFILLAMA_API_KEY`: API key for DeFiLlama service
- `NEXT_PUBLIC_DEFILLAMA_API_KEY`: Public-facing API key for client-side DeFiLlama API calls

**Important**: Always retrieve and use the actual environment variables from `.env.local` file when needed. The API keys are already configured in this file.

## Critical Rules

### Data Integrity
- **NEVER invent or mock data when real API data is not available**
- If API doesn't return correct and real-time data, show "-" instead of fake data
- Always prioritize showing empty state over misleading information
- Mock data should only be used in clear development/testing contexts, never in production

### API Integration
- Always validate API response structure before displaying data
- Log API calls for debugging purposes
- Handle API failures gracefully with clear error messages
- Use proper fallbacks that don't mislead users

### Best Practices
- Verify real data is loading before showing it to users
- Test API endpoints thoroughly
- Never assume API response formats without verification
- **ALWAYS test code changes in the actual browser, not just server/API testing**
- Check browser console for client-side errors and network failures
- Verify UI actually renders expected data before considering task complete

## Recent Changes

### 2025-01-11: Fixed Historical Token Data
- **FIXED**: Replaced mock historical price generation with real DeFiLlama API calls
- **API Endpoint**: `https://coins.llama.fi/chart/{address}?start={timestamp}&end={timestamp}&span={days}&period={interval}`
- **Data Source**: Now uses real historical price data from DeFiLlama/CoinGecko
- **CAGR Calculations**: Now based on actual price movements, not simulated data
- **Fallback**: Realistic CAGR placeholders only used if API fails, never as primary data source

### 2025-01-11: Comprehensive Caching System
- **IMPLEMENTED**: Multi-layer caching system for instant app loading
- **Cache Layers**: In-memory cache + localStorage for persistence across sessions
- **Cache Categories**: 
  - Token Prices (2min TTL)
  - Pools Data (5min TTL) 
  - Token Historical (10min TTL)
  - Pool Historical (15min TTL)
- **Features**: 
  - Automatic cache invalidation and cleanup
  - Cache statistics dashboard
  - Background preloading of critical data
  - Smart fallback hierarchy (memory -> localStorage -> API)
- **Performance**: First visit loads from API, subsequent visits load instantly from cache
- **Added Time Windows**: Extended token charts to include 3-year historical data