/**
 * Sync Pools Job using Supabase Client
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function syncPools() {
  console.log('🚀 Starting pools sync job...');

  let jobId = null;

  try {
    // Create sync job record
    const { data: job, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: 'pools-sync',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) throw jobError;
    jobId = job.id;
    console.log(`📝 Created sync job ID: ${jobId}`);

    // Fetch pools from DeFiLlama
    console.log('📡 Fetching pools from DeFiLlama...');
    const response = await axios.get('https://yields.llama.fi/pools', {
      timeout: 60000
    });

    const { data: pools } = response.data;
    console.log(`📊 Received ${pools.length} pools`);

    // Filter for high TVL pools (>= $1M)
    const highTvlPools = pools
      .filter(pool => pool.tvlUsd >= 1000000)
      .map(pool => ({
        defillama_pool_id: pool.pool,
        symbol: pool.symbol,
        chain: pool.chain,
        project: pool.project,
        tvl_usd: pool.tvlUsd,
        apy: pool.apy,
        apy_base: pool.apyBase,
        apy_reward: pool.apyReward,
        apy_mean_30d: pool.apyMean30d,
        volume_usd_1d: pool.volumeUsd1d,
        volume_usd_7d: pool.volumeUsd7d,
        stablecoin: pool.stablecoin || false,
        il_risk: pool.ilRisk,
        exposure: pool.exposure,
        pool_meta: pool.poolMeta,
        underlying_tokens: pool.underlyingTokens,
        url: pool.url,
        mu: pool.mu,
        sigma: pool.sigma,
        count: pool.count,
        outlier: pool.outlier || false,
        inception: pool.inception ? pool.inception : null
      }));

    console.log(`💎 Found ${highTvlPools.length} pools with TVL >= $1M`);

    if (highTvlPools.length === 0) {
      console.log('⚠️ No pools to sync');
      await supabase
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_processed: 0
        })
        .eq('id', jobId);
      return;
    }

    // Batch upsert pools
    const batchSize = 100;
    let totalProcessed = 0;

    for (let i = 0; i < highTvlPools.length; i += batchSize) {
      const batch = highTvlPools.slice(i, i + batchSize);

      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(highTvlPools.length / batchSize)} (${batch.length} pools)`);

      const { error: upsertError } = await supabase
        .from('pools')
        .upsert(batch, {
          onConflict: 'defillama_pool_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('❌ Batch upsert error:', upsertError.message);
        throw upsertError;
      }

      totalProcessed += batch.length;
      console.log(`✅ Processed ${totalProcessed}/${highTvlPools.length} pools`);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < highTvlPools.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update sync job as completed
    await supabase
      .from('sync_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: totalProcessed
      })
      .eq('id', jobId);

    console.log(`🎉 Pools sync completed! Processed ${totalProcessed} pools`);

  } catch (error) {
    console.error('❌ Pools sync failed:', error.message);

    // Update sync job as failed
    if (jobId) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          records_processed: 0,
          error_message: error.message
        })
        .eq('id', jobId);
    }

    throw error;
  }
}

// Run if called directly (fix for Node.js ES modules)
if (process.argv[1] && process.argv[1].endsWith('supabase-sync-pools.js')) {
  syncPools()
    .then(() => {
      console.log('✅ Sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Sync failed:', error.message);
      process.exit(1);
    });
}

export { syncPools };