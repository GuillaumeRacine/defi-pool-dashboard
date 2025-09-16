/**
 * Sync Liquidity Pools from DeFiLlama
 * Downloads pools data and extracts contract addresses for mapping
 */

import axios from 'axios';
import { db } from '../utils/database.js';
import { logger, logApiCall } from '../utils/logger.js';
import { rateLimiter } from '../utils/rate-limiter.js';

export async function syncPools() {
  const startTime = Date.now();
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  try {
    logger.info('🏊 Starting pools sync from DeFiLlama');

    // Fetch pools from DeFiLlama yields API
    const apiStart = Date.now();
    await rateLimiter.wait();

    const response = await axios.get('https://yields.llama.fi/pools', {
      timeout: 60000, // Pools endpoint can be slow
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DeFi-Dashboard-Sync/1.0'
      }
    });

    logApiCall('https://yields.llama.fi/pools', Date.now() - apiStart, response.status);

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid response format from DeFiLlama pools endpoint');
    }

    const pools = response.data.data;
    logger.info(`📥 Fetched ${pools.length} pools from DeFiLlama`);

    // Filter out pools with very low TVL to reduce noise
    const minTvl = 10000; // $10k minimum
    const filteredPools = pools.filter(pool => (pool.tvlUsd || 0) >= minTvl);
    logger.info(`📊 Filtered to ${filteredPools.length} pools with TVL >= $${minTvl.toLocaleString()}`);

    // Get protocol mappings to link pools to protocols
    const protocolMappings = await getProtocolMappings();

    // Process pools in batches
    const batchSize = 50; // Smaller batches due to data size
    for (let i = 0; i < filteredPools.length; i += batchSize) {
      const batch = filteredPools.slice(i, i + batchSize);

      await db.transaction(async (client) => {
        for (const pool of batch) {
          try {
            await processPool(client, pool, protocolMappings);
            recordsProcessed++;
          } catch (error) {
            logger.warn(`Failed to process pool ${pool.pool}:`, error.message);
          }
        }
      });

      // Log progress every 1000 pools
      if (i % 1000 === 0 || i + batchSize >= filteredPools.length) {
        const progress = Math.round((i + batch.length) / filteredPools.length * 100);
        logger.info(`📊 Processed ${i + batch.length}/${filteredPools.length} pools (${progress}%)`);
      }
    }

    // Get final stats
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_pools,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as updated_recently,
        AVG(tvl_usd) as avg_tvl,
        SUM(tvl_usd) as total_tvl
      FROM pools
    `);

    const stats = statsResult.rows[0];
    recordsUpdated = parseInt(stats.updated_recently);
    recordsCreated = recordsProcessed - recordsUpdated;

    const duration = Date.now() - startTime;
    logger.info(`✅ Pools sync completed in ${duration}ms`, {
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      totalPools: stats.total_pools,
      avgTvl: parseFloat(stats.avg_tvl).toFixed(2),
      totalTvl: parseFloat(stats.total_tvl).toFixed(2)
    });

    return {
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      duration
    };

  } catch (error) {
    logger.error('❌ Pools sync failed:', error);
    throw error;
  }
}

async function getProtocolMappings() {
  const result = await db.query(`
    SELECT defillama_id, id, name
    FROM protocols
  `);

  const mappings = {};
  result.rows.forEach(row => {
    mappings[row.defillama_id] = row.id;
    // Also map by name for fallback
    mappings[row.name.toLowerCase()] = row.id;
  });

  return mappings;
}

async function processPool(client, poolData, protocolMappings) {
  // Extract contract addresses from various fields
  const contractAddresses = extractContractAddresses(poolData);

  // Find protocol ID
  const protocolId = protocolMappings[poolData.project] ||
                    protocolMappings[poolData.project?.toLowerCase()] || null;

  // Clean and structure pool data
  const pool = {
    defillama_pool_id: poolData.pool,
    protocol_id: protocolId,
    chain: poolData.chain,
    project: poolData.project,
    symbol: poolData.symbol,
    pool_name: generatePoolName(poolData),

    // Contract addresses (your key innovation!)
    contract_address: contractAddresses.primary,
    factory_address: contractAddresses.factory,
    router_address: contractAddresses.router,

    // Token composition
    underlying_tokens: poolData.underlyingTokens || [],
    token_symbols: extractTokenSymbols(poolData),
    token_decimals: poolData.underlyingTokensDecimals || [],
    pool_tokens: contractAddresses.poolTokens,

    // Financial metrics
    tvl_usd: parseFloat(poolData.tvlUsd) || 0,
    apy: parseFloat(poolData.apy) || 0,
    apy_base: parseFloat(poolData.apyBase) || 0,
    apy_reward: parseFloat(poolData.apyReward) || 0,
    apy_mean_30d: parseFloat(poolData.apyMean30d) || 0,
    il_risk: poolData.ilRisk || null,
    il_7d: parseFloat(poolData.il7d) || 0,

    // Pool characteristics
    pool_type: detectPoolType(poolData),
    fee_tier: parseFloat(poolData.poolMeta?.feeTier) || 0,
    stable_pool: isStablePool(poolData),
    exposure: poolData.exposure,

    // Confidence scoring based on data completeness
    confidence_score: calculateConfidenceScore(poolData),

    // Store complete metadata
    pool_meta: poolData.poolMeta || {},
    predictions: poolData.predictions || {}
  };

  // Upsert pool
  const query = `
    INSERT INTO pools (
      defillama_pool_id, protocol_id, chain, project, symbol, pool_name,
      contract_address, factory_address, router_address,
      underlying_tokens, token_symbols, token_decimals, pool_tokens,
      tvl_usd, apy, apy_base, apy_reward, apy_mean_30d, il_risk, il_7d,
      pool_type, fee_tier, stable_pool, exposure, confidence_score,
      pool_meta, predictions, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW(), NOW()
    )
    ON CONFLICT (defillama_pool_id)
    DO UPDATE SET
      protocol_id = EXCLUDED.protocol_id,
      chain = EXCLUDED.chain,
      project = EXCLUDED.project,
      symbol = EXCLUDED.symbol,
      pool_name = EXCLUDED.pool_name,
      contract_address = EXCLUDED.contract_address,
      factory_address = EXCLUDED.factory_address,
      router_address = EXCLUDED.router_address,
      underlying_tokens = EXCLUDED.underlying_tokens,
      token_symbols = EXCLUDED.token_symbols,
      token_decimals = EXCLUDED.token_decimals,
      pool_tokens = EXCLUDED.pool_tokens,
      tvl_usd = EXCLUDED.tvl_usd,
      apy = EXCLUDED.apy,
      apy_base = EXCLUDED.apy_base,
      apy_reward = EXCLUDED.apy_reward,
      apy_mean_30d = EXCLUDED.apy_mean_30d,
      il_risk = EXCLUDED.il_risk,
      il_7d = EXCLUDED.il_7d,
      pool_type = EXCLUDED.pool_type,
      fee_tier = EXCLUDED.fee_tier,
      stable_pool = EXCLUDED.stable_pool,
      exposure = EXCLUDED.exposure,
      confidence_score = EXCLUDED.confidence_score,
      pool_meta = EXCLUDED.pool_meta,
      predictions = EXCLUDED.predictions,
      updated_at = NOW()
    RETURNING id
  `;

  const values = [
    pool.defillama_pool_id,
    pool.protocol_id,
    pool.chain,
    pool.project,
    pool.symbol,
    pool.pool_name,
    pool.contract_address,
    pool.factory_address,
    pool.router_address,
    JSON.stringify(pool.underlying_tokens),
    JSON.stringify(pool.token_symbols),
    JSON.stringify(pool.token_decimals),
    JSON.stringify(pool.pool_tokens),
    pool.tvl_usd,
    pool.apy,
    pool.apy_base,
    pool.apy_reward,
    pool.apy_mean_30d,
    pool.il_risk,
    pool.il_7d,
    pool.pool_type,
    pool.fee_tier,
    pool.stable_pool,
    pool.exposure,
    pool.confidence_score,
    JSON.stringify(pool.pool_meta),
    JSON.stringify(pool.predictions)
  ];

  const result = await client.query(query, values);

  // If we found contract addresses, create mappings
  if (contractAddresses.primary) {
    await createContractMapping(client, pool.defillama_pool_id, pool.chain, pool.project, contractAddresses.primary, 'pool');
  }

  return result.rows[0];
}

function extractContractAddresses(poolData) {
  const addresses = {
    primary: null,
    factory: null,
    router: null,
    poolTokens: []
  };

  // Try to extract from pool ID (often contains address)
  if (poolData.pool && poolData.pool.match(/^0x[a-fA-F0-9]{40}$/)) {
    addresses.primary = poolData.pool.toLowerCase();
  }

  // Extract from underlyingTokens
  if (poolData.underlyingTokens && Array.isArray(poolData.underlyingTokens)) {
    const validAddresses = poolData.underlyingTokens.filter(addr =>
      addr && addr.match(/^0x[a-fA-F0-9]{40}$/)
    );
    if (validAddresses.length > 0) {
      addresses.poolTokens = validAddresses.map(addr => addr.toLowerCase());
    }
  }

  // Extract from poolMeta
  if (poolData.poolMeta) {
    if (poolData.poolMeta.lpToken && poolData.poolMeta.lpToken.match(/^0x[a-fA-F0-9]{40}$/)) {
      addresses.primary = poolData.poolMeta.lpToken.toLowerCase();
    }
    if (poolData.poolMeta.factory && poolData.poolMeta.factory.match(/^0x[a-fA-F0-9]{40}$/)) {
      addresses.factory = poolData.poolMeta.factory.toLowerCase();
    }
  }

  return addresses;
}

function extractTokenSymbols(poolData) {
  const symbols = [];

  if (poolData.symbol && poolData.symbol.includes('-')) {
    symbols.push(...poolData.symbol.split('-'));
  } else if (poolData.symbol) {
    symbols.push(poolData.symbol);
  }

  return symbols;
}

function generatePoolName(poolData) {
  if (poolData.poolMeta?.poolName) return poolData.poolMeta.poolName;
  if (poolData.symbol) return `${poolData.project} ${poolData.symbol}`;
  return `${poolData.project} Pool`;
}

function detectPoolType(poolData) {
  const project = poolData.project?.toLowerCase() || '';
  const symbol = poolData.symbol?.toLowerCase() || '';

  if (project.includes('uniswap') && project.includes('v3')) return 'uniswap-v3';
  if (project.includes('uniswap') && project.includes('v2')) return 'uniswap-v2';
  if (project.includes('sushiswap')) return 'sushiswap';
  if (project.includes('pancakeswap')) return 'pancakeswap';
  if (project.includes('balancer')) return 'balancer';
  if (project.includes('curve')) return 'curve';
  if (project.includes('aave')) return 'aave-lending';
  if (project.includes('compound')) return 'compound-lending';

  return 'unknown';
}

function isStablePool(poolData) {
  const symbol = poolData.symbol?.toLowerCase() || '';
  const stableIndicators = ['usdc', 'usdt', 'dai', 'busd', 'frax', 'lusd'];
  return stableIndicators.some(stable => symbol.includes(stable));
}

function calculateConfidenceScore(poolData) {
  let score = 0.5; // Base score

  // Boost for having TVL data
  if (poolData.tvlUsd && poolData.tvlUsd > 0) score += 0.1;

  // Boost for having APY data
  if (poolData.apy && poolData.apy > 0) score += 0.1;

  // Boost for having underlying tokens
  if (poolData.underlyingTokens && poolData.underlyingTokens.length > 0) score += 0.1;

  // Boost for having pool metadata
  if (poolData.poolMeta && Object.keys(poolData.poolMeta).length > 0) score += 0.1;

  // Boost for established protocols
  const establishedProtocols = ['uniswap', 'sushiswap', 'curve', 'balancer', 'aave', 'compound'];
  if (establishedProtocols.some(p => poolData.project?.toLowerCase().includes(p))) score += 0.1;

  return Math.min(score, 1.0);
}

async function createContractMapping(client, poolId, chain, project, contractAddress, contractType) {
  const query = `
    INSERT INTO contract_mappings (
      defillama_pool_id, chain, protocol, contract_address, contract_type,
      verified, verification_method, confidence_score, data_sources,
      is_active, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, false, 'defillama_extraction', 0.7,
      $6, true, NOW(), NOW()
    )
    ON CONFLICT (defillama_pool_id, contract_address, contract_type)
    DO UPDATE SET
      confidence_score = GREATEST(contract_mappings.confidence_score, EXCLUDED.confidence_score),
      updated_at = NOW()
  `;

  const dataSources = JSON.stringify(['defillama_pools_api']);

  await client.query(query, [poolId, chain, project, contractAddress, contractType, dataSources]);
}