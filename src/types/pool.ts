/**
 * Type definitions for DeFi pool data following contract-address-based universal identifier strategy
 * Based on the data best practices guide for multi-chain LP position tracking
 */

export interface PoolTimeseriesPoint {
  date: string;
  timestamp?: string | number; // Support both string and number timestamps
  tvl_usd?: number;
  tvlUsd?: number; // Support both formats
  apy?: number;
  apyBase?: number; // Base APY component
  apyReward?: number; // Reward APY component
  volume_24h?: number;
  volumeUsd1d?: number; // Support 1d volume format
  fees_24h?: number;
  feesUsd1d?: number; // Support 1d fees format
}

export interface PoolComposition {
  composition_note: string;
  solscan_link?: string;
  explorer_links?: {
    [key: string]: string;
  };
  token_accounts?: {
    [tokenSymbol: string]: {
      amount: number;
      value_usd: number;
    };
  };
}

export interface AugmentationSource {
  orca_metrics?: {
    apy_24h: number;
    current_liquidity: number;
    volume_24h: number;
    lp_token_mint?: string;
  };
  augmented_at: string;
}

export interface PoolData {
  // Universal identifier (PRIMARY KEY)
  universal_id: string; // Format: blockchain:contract_address
  contract_address: string;
  blockchain: 'solana' | 'ethereum' | 'polygon' | 'base';
  
  // Core pool info
  pool_name: string;
  protocol: string;
  
  // Historical data
  timeseries: PoolTimeseriesPoint[];
  data_points: number;
  
  // Real-time augmentation data
  orca_augmentation?: AugmentationSource;
  
  // Pool composition (token mix)
  composition?: PoolComposition;
  
  // Data quality and provenance
  data_quality_score: number;
  validation_passed: boolean;
  data_sources: string[];
  
  // Reference tracking
  defillama_reference?: {
    defillama_id: string;
    original_key: string;
  };
  
  // Metadata
  last_updated: string;
  created_at?: string;
}

export interface PoolRegistryMetadata {
  created_at: string;
  data_sources: string[];
  augmentation_method: string;
  validation_passed: boolean;
  quality_summary: {
    total_pools: number;
    successfully_matched: number;
    match_rate: number;
    average_quality_score: number;
  };
  processing_version: string;
}

export interface PoolRegistry {
  metadata: PoolRegistryMetadata;
  pools: {
    [contractKey: string]: PoolData;
  };
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  cached: boolean;
  timestamp: string;
}