/**
 * Sync Pools API Route
 * Fetches pools from DeFiLlama and stores them in the database
 */

import { NextResponse } from 'next/server';
import { batchUpsertPools, createSyncJob, updateSyncJob } from '@/lib/database';

export async function POST() {
  let jobId: number | null = null;

  try {
    // Create a sync job
    const job = await createSyncJob('pools-sync');
    jobId = job?.id || null;

    // Fetch pools from DeFiLlama
    console.log('Fetching pools from DeFiLlama...');
    const response = await fetch('https://yields.llama.fi/pools', {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pools: ${response.statusText}`);
    }

    const { data: pools } = await response.json();

    // Filter for high TVL pools (>= $1M)
    const highTvlPools = pools
      .filter((pool: any) => pool.tvlUsd >= 1000000)
      .map((pool: any) => ({
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
        inception: pool.inception ? new Date(pool.inception) : null
      }));

    console.log(`Found ${highTvlPools.length} pools with TVL >= $1M`);

    // Batch upsert pools to database
    const batchSize = 100;
    let totalProcessed = 0;

    for (let i = 0; i < highTvlPools.length; i += batchSize) {
      const batch = highTvlPools.slice(i, i + batchSize);
      await batchUpsertPools(batch);
      totalProcessed += batch.length;
      console.log(`Processed ${totalProcessed}/${highTvlPools.length} pools`);
    }

    // Update sync job as completed
    if (jobId) {
      await updateSyncJob(jobId, 'completed', totalProcessed);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${totalProcessed} pools`,
      data: {
        jobId,
        poolsProcessed: totalProcessed,
        totalPoolsFound: pools.length,
        highTvlPools: highTvlPools.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pool sync error:', error);

    // Update sync job as failed
    if (jobId) {
      await updateSyncJob(
        jobId,
        'failed',
        0,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return NextResponse.json({
      success: false,
      message: 'Pool sync failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}