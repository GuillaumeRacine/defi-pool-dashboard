/**
 * Database Pools API Route
 * Fetches pools from the database instead of DeFiLlama API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTopPools, getPoolsByChain, getPoolsByProject, searchPools } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain');
    const project = searchParams.get('project');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const minTvl = parseInt(searchParams.get('minTvl') || '1000000');

    let pools;

    if (search) {
      // Search pools by term
      pools = await searchPools(search, limit);
    } else if (chain) {
      // Get pools by specific chain
      pools = await getPoolsByChain(chain, limit);
    } else if (project) {
      // Get pools by specific project
      pools = await getPoolsByProject(project, limit);
    } else {
      // Get top pools by TVL
      pools = await getTopPools(minTvl, limit);
    }

    // Transform data to match expected format
    const transformedPools = pools.map((pool: any) => ({
      pool: pool.defillama_pool_id,
      chain: pool.chain,
      project: pool.project,
      symbol: pool.symbol,
      tvlUsd: parseFloat(pool.tvl_usd || 0),
      apy: parseFloat(pool.apy || 0),
      apyBase: parseFloat(pool.apy_base || 0),
      apyReward: parseFloat(pool.apy_reward || 0),
      apyMean30d: parseFloat(pool.apy_mean_30d || 0),
      volumeUsd1d: parseFloat(pool.volume_usd_1d || 0),
      volumeUsd7d: parseFloat(pool.volume_usd_7d || 0),
      stablecoin: pool.stablecoin,
      ilRisk: pool.il_risk,
      exposure: pool.exposure,
      poolMeta: pool.pool_meta,
      underlyingTokens: pool.underlying_tokens,
      url: pool.url,
      mu: parseFloat(pool.mu || 0),
      sigma: parseFloat(pool.sigma || 0),
      count: pool.count,
      outlier: pool.outlier,
      inception: pool.inception,
      contractAddress: pool.contract_address,
      updatedAt: pool.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedPools,
      count: transformedPools.length,
      source: 'database',
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      }
    });
  } catch (error) {
    console.error('Database pools API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch pools from database',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}