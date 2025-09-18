/**
 * Database Service Layer
 * Provides functions to interact with Supabase database
 */

import { Protocol, Pool, PoolDailySnapshot } from './supabase';
import { supabase } from './supabase';

// Protocol operations
export async function getTopProtocols(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('protocols')
      .select('*')
      .order('tvl_usd', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching protocols:', error);
    return [];
  }
}

export async function upsertProtocol(protocol: Partial<Protocol>) {
  try {
    const { data, error } = await supabase
      .from('protocols')
      .upsert(protocol, {
        onConflict: 'defillama_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting protocol:', error);
    return null;
  }
}

// Pool operations
export async function getTopPools(minTvl = 1000000, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .gte('tvl_usd', minTvl)
      .order('tvl_usd', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching pools:', error);
    return [];
  }
}

export async function getPoolsByChain(chain: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .eq('chain', chain)
      .order('tvl_usd', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching pools by chain:', error);
    return [];
  }
}

export async function getPoolsByProject(project: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .eq('project', project)
      .order('tvl_usd', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching pools by project:', error);
    return [];
  }
}

export async function upsertPool(pool: Partial<Pool>) {
  try {
    const { data, error } = await supabase
      .from('pools')
      .upsert(pool, {
        onConflict: 'defillama_pool_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting pool:', error);
    return null;
  }
}

// Historical data operations
export async function getPoolHistoricalData(poolId: string, days = 30) {
  try {
    // First get the pool's internal ID
    const { data: poolData, error: poolError } = await supabase
      .from('pools')
      .select('id')
      .eq('defillama_pool_id', poolId)
      .single();

    if (poolError) throw poolError;
    if (!poolData) return [];

    // Then get historical snapshots
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('pool_daily_snapshots')
      .select('*')
      .eq('pool_id', poolData.id)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching pool historical data:', error);
    return [];
  }
}

export async function insertPoolSnapshot(snapshot: Partial<PoolDailySnapshot>) {
  try {
    const { data, error } = await supabase
      .from('pool_daily_snapshots')
      .insert(snapshot)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting pool snapshot:', error);
    return null;
  }
}

// Sync job operations
export async function createSyncJob(jobType: string) {
  try {
    const { data, error } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: jobType,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating sync job:', error);
    return null;
  }
}

export async function updateSyncJob(
  jobId: number,
  status: 'completed' | 'failed',
  recordsProcessed: number,
  errorMessage?: string
) {
  try {
    const { data, error } = await supabase
      .from('sync_jobs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        records_processed: recordsProcessed,
        error_message: errorMessage
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating sync job:', error);
    return null;
  }
}

export async function getRecentSyncJobs(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching sync jobs:', error);
    return [];
  }
}

// Aggregation queries using raw SQL for complex operations
export async function getChainStats() {
  try {
    // Fetch all pools and aggregate in memory using Supabase
    const { data: pools, error } = await supabase
      .from('pools')
      .select('chain, tvl_usd, apy')
      .gt('tvl_usd', 0);

    if (error) throw error;
    if (!pools || pools.length === 0) return [];

    // Aggregate in memory
    const chainMap = new Map<string, any>();

    pools.forEach(pool => {
      const existing = chainMap.get(pool.chain) || {
        chain: pool.chain,
        pool_count: 0,
        total_tvl: 0,
        apy_sum: 0,
        max_pool_tvl: 0
      };

      existing.pool_count++;
      existing.total_tvl += parseFloat(pool.tvl_usd || '0');
      existing.apy_sum += parseFloat(pool.apy || '0');
      existing.max_pool_tvl = Math.max(existing.max_pool_tvl, parseFloat(pool.tvl_usd || '0'));

      chainMap.set(pool.chain, existing);
    });

    return Array.from(chainMap.values()).map(stat => ({
      ...stat,
      avg_apy: stat.pool_count > 0 ? stat.apy_sum / stat.pool_count : 0
    })).sort((a, b) => b.total_tvl - a.total_tvl);
  } catch (error) {
    console.error('Error fetching chain stats:', error);
    return [];
  }
}

export async function getProjectStats() {
  try {
    // Fetch all pools and aggregate in memory using Supabase
    const { data: pools, error } = await supabase
      .from('pools')
      .select('project, tvl_usd, apy, volume_usd_1d')
      .gt('tvl_usd', 0);

    if (error) throw error;
    if (!pools || pools.length === 0) return [];

    // Aggregate in memory
    const projectMap = new Map<string, any>();

    pools.forEach(pool => {
      const existing = projectMap.get(pool.project) || {
        project: pool.project,
        pool_count: 0,
        total_tvl: 0,
        apy_sum: 0,
        total_volume_24h: 0
      };

      existing.pool_count++;
      existing.total_tvl += parseFloat(pool.tvl_usd || '0');
      existing.apy_sum += parseFloat(pool.apy || '0');
      existing.total_volume_24h += parseFloat(pool.volume_usd_1d || '0');

      projectMap.set(pool.project, existing);
    });

    return Array.from(projectMap.values()).map(stat => ({
      ...stat,
      avg_apy: stat.pool_count > 0 ? stat.apy_sum / stat.pool_count : 0
    }))
    .sort((a, b) => b.total_tvl - a.total_tvl)
    .slice(0, 20);
  } catch (error) {
    console.error('Error fetching project stats:', error);
    return [];
  }
}

// Search functions
export async function searchPools(searchTerm: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .or(`symbol.ilike.%${searchTerm}%,project.ilike.%${searchTerm}%,chain.ilike.%${searchTerm}%`)
      .order('tvl_usd', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching pools:', error);
    return [];
  }
}

export async function searchProtocols(searchTerm: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('protocols')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      .order('tvl_usd', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching protocols:', error);
    return [];
  }
}

// Batch operations for sync jobs
export async function batchUpsertPools(pools: Partial<Pool>[]) {
  try {
    const { data, error } = await supabase
      .from('pools')
      .upsert(pools, {
        onConflict: 'defillama_pool_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error batch upserting pools:', error);
    return [];
  }
}

export async function batchUpsertProtocols(protocols: Partial<Protocol>[]) {
  try {
    const { data, error } = await supabase
      .from('protocols')
      .upsert(protocols, {
        onConflict: 'defillama_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error batch upserting protocols:', error);
    return [];
  }
}