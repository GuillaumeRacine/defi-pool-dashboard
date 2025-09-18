/**
 * Supabase Client Configuration
 * Provides both client and server-side Supabase instances
 */

import { createClient } from '@supabase/supabase-js';
// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || '';

// Create Supabase client for API operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to test database connection
export async function testDatabaseConnection() {
  try {
    // Test Supabase REST API connection instead of direct PostgreSQL
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('id')
      .limit(1);

    if (error) {
      // If table doesn't exist, try to check if we can at least connect
      if (error.message.includes('does not exist')) {
        console.log('⚠️ Database connected but tables not initialized');
        return true; // Connection works, just no tables yet
      }
      throw error;
    }

    console.log('✅ Database connected successfully via Supabase');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Database types for TypeScript
export interface Protocol {
  id?: number;
  defillama_id: string;
  name: string;
  slug: string;
  tvl_usd: number;
  change_1d?: number;
  change_7d?: number;
  chains?: string[];
  category?: string;
  updated_at?: Date;
}

export interface Pool {
  id?: number;
  defillama_pool_id: string;
  symbol: string;
  chain: string;
  project: string;
  tvl_usd: number;
  apy?: number;
  apy_base?: number;
  apy_reward?: number;
  volume_usd_1d?: number;
  volume_usd_7d?: number;
  contract_address?: string;
  stablecoin?: boolean;
  il_risk?: string;
  inception?: Date;
  updated_at?: Date;
}

export interface PoolDailySnapshot {
  id?: number;
  pool_id: number;
  date: Date;
  tvl_usd: number;
  apy?: number;
  apy_base?: number;
  apy_reward?: number;
  volume_24h?: number;
  fees_24h?: number;
  token_balances?: any;
  token_prices_usd?: any;
  created_at?: Date;
}