/**
 * DefiLlama API Integration
 * Implements rate limiting, error handling, and data validation per best practices
 */

import { PoolData, PoolTimeseriesPoint, ApiResponse } from '@/types/pool';

const DEFILLAMA_BASE_URL = 'https://api.llama.fi';
const DEFILLAMA_PRO_URL = 'https://pro-api.llama.fi';

class DefiLlamaAPI {
  private apiKey: string;
  private rateLimitMs: number = 200; // 200ms between requests
  private lastRequest: number = 0;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_DEFILLAMA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('DefiLlama API key not found in environment variables');
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.rateLimitMs) {
      await this.sleep(this.rateLimitMs - timeSinceLastRequest);
    }
    
    this.lastRequest = Date.now();
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async safeApiCall(url: string, retries: number = 3): Promise<any> {
    const cacheKey = url;
    const cachedData = this.getCachedData(cacheKey);
    
    if (cachedData) {
      return { data: cachedData, cached: true };
    }

    await this.rateLimitDelay();

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 429) {
          const backoffTime = this.rateLimitMs * Math.pow(2, attempt);
          console.warn(`Rate limited, waiting ${backoffTime}ms`);
          await this.sleep(backoffTime);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.setCachedData(cacheKey, data);
        
        return { data, cached: false };
        
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        
        if (attempt === retries - 1) {
          throw error;
        }
        
        await this.sleep(1000 * (attempt + 1));
      }
    }
  }

  /**
   * Get all available protocols with pool data
   */
  async getProtocols(): Promise<ApiResponse<any[]>> {
    try {
      const result = await this.safeApiCall(`${DEFILLAMA_BASE_URL}/protocols`);
      
      return {
        data: result.data,
        error: null,
        cached: result.cached,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get pools for a specific protocol
   */
  async getProtocolPools(protocol: string): Promise<ApiResponse<any[]>> {
    try {
      const result = await this.safeApiCall(`${DEFILLAMA_BASE_URL}/pools/${protocol}`);
      
      return {
        data: result.data,
        error: null,
        cached: result.cached,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get historical data for a specific pool
   */
  async getPoolHistoricalData(poolId: string): Promise<ApiResponse<PoolTimeseriesPoint[]>> {
    try {
      const result = await this.safeApiCall(`${DEFILLAMA_BASE_URL}/chart/${poolId}`);
      
      // Transform data to our standard format
      const timeseries: PoolTimeseriesPoint[] = result.data.data?.map((point: any) => ({
        date: new Date(point.date * 1000).toISOString().split('T')[0],
        tvl_usd: point.tvlUsd || 0,
        apy: point.apy || undefined,
        volume_24h: point.volumeUsd1d || undefined,
        fees_24h: point.feesUsd1d || undefined
      })) || [];

      return {
        data: timeseries,
        error: null,
        cached: result.cached,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get current yields for all pools
   */
  async getCurrentYields(): Promise<ApiResponse<any[]>> {
    try {
      const result = await this.safeApiCall(`${DEFILLAMA_BASE_URL}/pools`);
      
      return {
        data: result.data?.data || [],
        error: null,
        cached: result.cached,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate pool data quality based on best practices criteria
   */
  validatePoolData(poolData: Partial<PoolData>): {
    score: number;
    issues: string[];
    passed: boolean;
  } {
    let score = 0;
    const issues: string[] = [];

    // Freshness check (60 points)
    if (poolData.timeseries && poolData.timeseries.length > 0) {
      const latestDate = new Date(poolData.timeseries[poolData.timeseries.length - 1].date);
      const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLatest <= 7) {
        score += 60;
      } else {
        issues.push(`Data staleness detected: ${Math.floor(daysSinceLatest)} days old`);
      }
    } else {
      issues.push('No timeseries data available');
    }

    // Completeness check (20 points)
    if (poolData.timeseries && poolData.timeseries.length >= 30) {
      score += 20;
    } else {
      issues.push(`Insufficient data points: ${poolData.timeseries?.length || 0} (minimum 30 required)`);
    }

    // Consistency check (10 points)
    if (poolData.timeseries && this.hasNoExtremeOutliers(poolData.timeseries)) {
      score += 10;
    } else {
      issues.push('Extreme outliers detected in data');
    }

    // Metadata check (10 points)
    if (poolData.contract_address && poolData.universal_id && poolData.blockchain) {
      score += 10;
    } else {
      issues.push('Missing required metadata fields');
    }

    return {
      score,
      issues,
      passed: score >= 80
    };
  }

  private hasNoExtremeOutliers(timeseries: PoolTimeseriesPoint[]): boolean {
    if (timeseries.length < 10) return true;

    const values = timeseries.map(point => point.tvl_usd).filter(v => v > 0);
    if (values.length === 0) return true;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Check if any value is more than 3 standard deviations from the mean
    return !values.some(value => Math.abs(value - mean) > (3 * stdDev));
  }
}

export const defiLlamaAPI = new DefiLlamaAPI();