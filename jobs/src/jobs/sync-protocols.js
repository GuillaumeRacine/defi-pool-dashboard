/**
 * Sync DeFi Protocols from DeFiLlama
 * Downloads and stores protocol data including TVL, volume, and metadata
 */

import axios from 'axios';
import { db } from '../utils/database.js';
import { logger, logApiCall } from '../utils/logger.js';
import { rateLimiter } from '../utils/rate-limiter.js';

export async function syncProtocols() {
  const startTime = Date.now();
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  try {
    logger.info('🔄 Starting protocol sync from DeFiLlama');

    // Fetch protocols from DeFiLlama
    const apiStart = Date.now();
    await rateLimiter.wait();

    const response = await axios.get('https://api.llama.fi/protocols', {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DeFi-Dashboard-Sync/1.0'
      }
    });

    logApiCall('https://api.llama.fi/protocols', Date.now() - apiStart, response.status);

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format from DeFiLlama protocols endpoint');
    }

    const protocols = response.data;
    logger.info(`📥 Fetched ${protocols.length} protocols from DeFiLlama`);

    // Process protocols in batches
    const batchSize = 100;
    for (let i = 0; i < protocols.length; i += batchSize) {
      const batch = protocols.slice(i, i + batchSize);

      await db.transaction(async (client) => {
        for (const protocol of batch) {
          try {
            await processProtocol(client, protocol);
            recordsProcessed++;
          } catch (error) {
            logger.warn(`Failed to process protocol ${protocol.id}:`, error.message);
          }
        }
      });

      // Log progress
      const progress = Math.round((i + batch.length) / protocols.length * 100);
      logger.info(`📊 Processed ${i + batch.length}/${protocols.length} protocols (${progress}%)`);
    }

    // Get final stats
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_protocols,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as updated_recently
      FROM protocols
    `);

    const stats = statsResult.rows[0];
    recordsUpdated = parseInt(stats.updated_recently);
    recordsCreated = recordsProcessed - recordsUpdated;

    const duration = Date.now() - startTime;
    logger.info(`✅ Protocol sync completed in ${duration}ms`, {
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      totalProtocols: stats.total_protocols
    });

    return {
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      duration
    };

  } catch (error) {
    logger.error('❌ Protocol sync failed:', error);
    throw error;
  }
}

async function processProtocol(client, protocolData) {
  // Extract and clean protocol data
  const protocol = {
    defillama_id: protocolData.id,
    name: protocolData.name,
    display_name: protocolData.displayName || protocolData.name,
    slug: protocolData.slug,
    category: protocolData.category,
    protocol_type: protocolData.protocolType,
    chains: protocolData.chains || [],
    description: protocolData.description,
    logo_url: protocolData.logo,
    website_url: protocolData.url,
    twitter_handle: protocolData.twitter,
    methodology: protocolData.methodology || null,
    methodology_url: protocolData.methodologyURL,

    // Financial metrics
    tvl_usd: parseFloat(protocolData.tvl) || 0,
    total_24h: parseFloat(protocolData.total24h) || 0,
    total_7d: parseFloat(protocolData.total7d) || 0,
    total_30d: parseFloat(protocolData.total30d) || 0,
    change_1d: parseFloat(protocolData.change_1d) || 0,
    change_7d: parseFloat(protocolData.change_7d) || 0,
    change_1m: parseFloat(protocolData.change_1m) || 0,

    // Store raw metadata for future use
    metadata: {
      parentProtocol: protocolData.parentProtocol,
      module: protocolData.module,
      linkedProtocols: protocolData.linkedProtocols,
      breakdown24h: protocolData.breakdown24h,
      breakdown30d: protocolData.breakdown30d,
      totalAllTime: protocolData.totalAllTime,
      average1y: protocolData.average1y,
      monthlyAverage1y: protocolData.monthlyAverage1y
    }
  };

  // Upsert protocol
  const query = `
    INSERT INTO protocols (
      defillama_id, name, display_name, slug, category, protocol_type,
      chains, description, logo_url, website_url, twitter_handle,
      methodology, methodology_url, tvl_usd, total_24h, total_7d, total_30d,
      change_1d, change_7d, change_1m, metadata, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW()
    )
    ON CONFLICT (defillama_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      display_name = EXCLUDED.display_name,
      slug = EXCLUDED.slug,
      category = EXCLUDED.category,
      protocol_type = EXCLUDED.protocol_type,
      chains = EXCLUDED.chains,
      description = EXCLUDED.description,
      logo_url = EXCLUDED.logo_url,
      website_url = EXCLUDED.website_url,
      twitter_handle = EXCLUDED.twitter_handle,
      methodology = EXCLUDED.methodology,
      methodology_url = EXCLUDED.methodology_url,
      tvl_usd = EXCLUDED.tvl_usd,
      total_24h = EXCLUDED.total_24h,
      total_7d = EXCLUDED.total_7d,
      total_30d = EXCLUDED.total_30d,
      change_1d = EXCLUDED.change_1d,
      change_7d = EXCLUDED.change_7d,
      change_1m = EXCLUDED.change_1m,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING id
  `;

  const values = [
    protocol.defillama_id,
    protocol.name,
    protocol.display_name,
    protocol.slug,
    protocol.category,
    protocol.protocol_type,
    protocol.chains,
    protocol.description,
    protocol.logo_url,
    protocol.website_url,
    protocol.twitter_handle,
    JSON.stringify(protocol.methodology),
    protocol.methodology_url,
    protocol.tvl_usd,
    protocol.total_24h,
    protocol.total_7d,
    protocol.total_30d,
    protocol.change_1d,
    protocol.change_7d,
    protocol.change_1m,
    JSON.stringify(protocol.metadata)
  ];

  const result = await client.query(query, values);
  return result.rows[0];
}