/**
 * DeFi Data Sync Jobs - Main Entry Point
 * Orchestrates all background jobs for syncing DeFiLlama data
 */

import dotenv from 'dotenv';
import cron from 'node-cron';
import { logger } from './utils/logger.js';
import { db } from './utils/database.js';
import { jobQueue } from './utils/job-queue.js';

// Import job handlers
import { syncProtocols } from './jobs/sync-protocols.js';
import { syncPools } from './jobs/sync-pools.js';
import { syncChains } from './jobs/sync-chains.js';
import { syncHistorical } from './jobs/sync-historical.js';
import { mapContracts } from './jobs/map-contracts.js';
import { createDailySnapshots } from './jobs/create-snapshots.js';
import { cleanupOldData } from './jobs/cleanup.js';

dotenv.config();

class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      // Test database connection
      await db.query('SELECT NOW()');
      logger.info('✅ Database connection established');

      // Register all jobs
      this.registerJobs();

      // Start job queue
      await jobQueue.start();
      logger.info('🚀 Job scheduler started');

      // Handle graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('❌ Failed to initialize job scheduler:', error);
      process.exit(1);
    }
  }

  registerJobs() {
    const jobConfigs = [
      {
        name: 'sync-chains',
        schedule: '0 1 * * *', // Daily at 1 AM
        handler: syncChains,
        priority: 'high',
        description: 'Sync blockchain data from DeFiLlama'
      },
      {
        name: 'sync-protocols',
        schedule: '0 2 * * *', // Daily at 2 AM
        handler: syncProtocols,
        priority: 'high',
        description: 'Sync protocol data from DeFiLlama'
      },
      {
        name: 'sync-pools',
        schedule: '0 3 * * *', // Daily at 3 AM
        handler: syncPools,
        priority: 'high',
        description: 'Sync pool data from DeFiLlama'
      },
      {
        name: 'map-contracts',
        schedule: '0 4 * * *', // Daily at 4 AM
        handler: mapContracts,
        priority: 'medium',
        description: 'Map DeFiLlama pools to contract addresses'
      },
      {
        name: 'create-snapshots',
        schedule: '0 5 * * *', // Daily at 5 AM
        handler: createDailySnapshots,
        priority: 'medium',
        description: 'Create daily snapshots for historical analysis'
      },
      {
        name: 'sync-historical',
        schedule: '0 6 * * 0', // Weekly on Sunday at 6 AM
        handler: syncHistorical,
        priority: 'low',
        description: 'Sync historical data for missing periods'
      },
      {
        name: 'cleanup-old-data',
        schedule: '0 7 * * 0', // Weekly on Sunday at 7 AM
        handler: cleanupOldData,
        priority: 'low',
        description: 'Clean up old logs and temporary data'
      }
    ];

    jobConfigs.forEach(config => {
      const task = cron.schedule(config.schedule, async () => {
        if (this.isShuttingDown) return;

        await jobQueue.add(config.name, {
          handler: config.handler,
          priority: config.priority,
          description: config.description
        });
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.jobs.set(config.name, {
        task,
        config,
        lastRun: null,
        nextRun: task.nextDate()
      });

      logger.info(`📅 Scheduled job: ${config.name} - ${config.description}`);
    });
  }

  async runJobNow(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }

    logger.info(`🏃 Running job manually: ${jobName}`);
    await jobQueue.add(jobName, {
      handler: job.config.handler,
      priority: 'immediate',
      description: `Manual run: ${job.config.description}`
    });
  }

  getJobStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        nextRun: job.nextRun?.toISOString(),
        lastRun: job.lastRun?.toISOString(),
        description: job.config.description,
        priority: job.config.priority
      };
    });
    return status;
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);
      this.isShuttingDown = true;

      // Stop accepting new jobs
      this.jobs.forEach(job => job.task.stop());

      // Wait for current jobs to complete
      await jobQueue.stop();

      // Close database connections
      await db.end();

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Initialize and start the scheduler
const scheduler = new JobScheduler();

// Handle CLI commands
const command = process.argv[2];
const jobName = process.argv[3];

switch (command) {
  case 'run':
    if (!jobName) {
      console.error('❌ Please specify a job name: npm run job run <job-name>');
      process.exit(1);
    }
    scheduler.initialize().then(() => {
      scheduler.runJobNow(jobName).catch(error => {
        logger.error(`❌ Failed to run job ${jobName}:`, error);
        process.exit(1);
      });
    });
    break;

  case 'status':
    scheduler.initialize().then(() => {
      const status = scheduler.getJobStatus();
      console.log('📊 Job Status:');
      console.table(status);
    });
    break;

  case 'list':
    scheduler.initialize().then(() => {
      const jobs = Array.from(scheduler.jobs.keys());
      console.log('📋 Available Jobs:');
      jobs.forEach(job => console.log(`  - ${job}`));
    });
    break;

  default:
    // Start normal scheduler
    scheduler.initialize();
    break;
}