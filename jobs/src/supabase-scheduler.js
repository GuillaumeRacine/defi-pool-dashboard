/**
 * Supabase-based Job Scheduler
 * Runs periodic sync jobs using Supabase client
 */

import dotenv from 'dotenv';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { syncPools } from './jobs/supabase-sync-pools.js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

class SupabaseJobScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  async initialize() {
    console.log('🚀 Initializing Supabase Job Scheduler...');

    try {
      // Test database connection
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('id')
        .limit(1);

      if (error && !error.message.includes('does not exist')) {
        throw error;
      }

      console.log('✅ Supabase connection verified');

      // Log startup
      await supabase.from('sync_jobs').insert({
        job_type: 'scheduler-startup',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        records_processed: 0
      });

      console.log('📝 Scheduler startup logged');

    } catch (error) {
      console.error('❌ Failed to initialize job scheduler:', error.message);
      throw error;
    }
  }

  scheduleJobs() {
    console.log('📅 Setting up cron schedules...');

    // Sync pools daily at 2 AM UTC
    const poolsJob = cron.schedule('0 2 * * *', async () => {
      console.log('🏊 Starting scheduled pools sync...');
      try {
        await syncPools();
        console.log('✅ Scheduled pools sync completed');
      } catch (error) {
        console.error('❌ Scheduled pools sync failed:', error.message);
      }
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.jobs.push({ name: 'pools-sync', job: poolsJob });

    // Manual trigger for immediate testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 Development mode: Running immediate sync...');
      setTimeout(async () => {
        try {
          await syncPools();
          console.log('✅ Development sync completed');
        } catch (error) {
          console.error('❌ Development sync failed:', error.message);
        }
      }, 5000); // Wait 5 seconds after startup
    }

    console.log(`📋 Scheduled ${this.jobs.length} jobs`);
  }

  start() {
    console.log('▶️ Starting job scheduler...');

    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`🟢 Started job: ${name}`);
    });

    this.isRunning = true;
    console.log('✨ Job scheduler is now running');

    // Log status every hour
    setInterval(async () => {
      try {
        const { count } = await supabase
          .from('sync_jobs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        console.log(`📊 Scheduler status: ${this.jobs.length} jobs active, ${count || 0} runs in last 24h`);
      } catch (error) {
        console.error('⚠️ Status check failed:', error.message);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  stop() {
    console.log('⏹️ Stopping job scheduler...');

    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`🔴 Stopped job: ${name}`);
    });

    this.isRunning = false;
    console.log('💤 Job scheduler stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      jobs: this.jobs.map(({ name }) => ({ name }))
    };
  }
}

// Global scheduler instance
const scheduler = new SupabaseJobScheduler();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  scheduler.stop();
  process.exit(0);
});

// Start the scheduler
async function main() {
  try {
    await scheduler.initialize();
    scheduler.scheduleJobs();
    scheduler.start();

    console.log('\n🎯 Scheduler is ready!');
    console.log('📝 Check logs for job execution status');
    console.log('🔄 Pools sync runs daily at 2 AM UTC');

    if (process.env.NODE_ENV !== 'production') {
      console.log('🧪 Development mode: immediate sync will run in 5 seconds');
    }

    // Keep the process alive
    process.stdin.resume();

  } catch (error) {
    console.error('💥 Failed to start scheduler:', error.message);
    process.exit(1);
  }
}

// Start if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scheduler };