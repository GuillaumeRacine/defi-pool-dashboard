/**
 * Supabase Database Client
 * Uses Supabase JS client for database operations
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
}

class SupabaseDatabase {
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('sync_jobs')
        .select('id')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        logger.warn('Database connected but tables not initialized');
        return true;
      }

      if (error) throw error;

      logger.info('✅ Supabase database connected successfully');
      return true;
    } catch (error) {
      logger.error('❌ Supabase database connection failed:', error.message);
      return false;
    }
  }

  async upsertPools(pools) {
    try {
      const { data, error } = await this.supabase
        .from('pools')
        .upsert(pools, {
          onConflict: 'defillama_pool_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      logger.info(`✅ Upserted ${pools.length} pools`);
      return data;
    } catch (error) {
      logger.error('Error upserting pools:', error.message);
      throw error;
    }
  }

  async upsertProtocols(protocols) {
    try {
      const { data, error } = await this.supabase
        .from('protocols')
        .upsert(protocols, {
          onConflict: 'defillama_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      logger.info(`✅ Upserted ${protocols.length} protocols`);
      return data;
    } catch (error) {
      logger.error('Error upserting protocols:', error.message);
      throw error;
    }
  }

  async createSyncJob(jobType) {
    try {
      const { data, error } = await this.supabase
        .from('sync_jobs')
        .insert({
          job_type: jobType,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`✅ Created sync job: ${jobType} (ID: ${data.id})`);
      return data;
    } catch (error) {
      logger.error('Error creating sync job:', error.message);
      throw error;
    }
  }

  async updateSyncJob(jobId, status, recordsProcessed, errorMessage = null) {
    try {
      const { data, error } = await this.supabase
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

      logger.info(`✅ Updated sync job ${jobId}: ${status}`);
      return data;
    } catch (error) {
      logger.error('Error updating sync job:', error.message);
      throw error;
    }
  }

  async getTableCounts() {
    try {
      const [poolsResult, protocolsResult, jobsResult] = await Promise.all([
        this.supabase.from('pools').select('id', { count: 'exact', head: true }),
        this.supabase.from('protocols').select('id', { count: 'exact', head: true }),
        this.supabase.from('sync_jobs').select('id', { count: 'exact', head: true })
      ]);

      return {
        pools: poolsResult.count || 0,
        protocols: protocolsResult.count || 0,
        sync_jobs: jobsResult.count || 0
      };
    } catch (error) {
      logger.error('Error getting table counts:', error.message);
      return { pools: 0, protocols: 0, sync_jobs: 0 };
    }
  }

  async getRecentSyncJobs(limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('sync_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching recent sync jobs:', error.message);
      return [];
    }
  }

  // Batch operations for large datasets
  async batchUpsert(table, records, batchSize = 1000) {
    const results = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      try {
        let result;
        if (table === 'pools') {
          result = await this.upsertPools(batch);
        } else if (table === 'protocols') {
          result = await this.upsertProtocols(batch);
        }

        results.push(...(result || []));
        logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`);

        // Add delay to avoid rate limiting
        if (i + batchSize < records.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        throw error;
      }
    }

    return results;
  }
}

export const supabaseDb = new SupabaseDatabase();