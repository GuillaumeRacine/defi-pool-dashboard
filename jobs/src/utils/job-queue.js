/**
 * Job Queue Management
 * Handles job prioritization, rate limiting, and error recovery
 */

import { logger, logJobStart, logJobComplete, logJobError } from './logger.js';
import { db } from './database.js';
import pLimit from 'p-limit';

class JobQueue {
  constructor() {
    this.queue = [];
    this.running = false;
    this.concurrentLimit = parseInt(process.env.MAX_CONCURRENT_JOBS || '3');
    this.limiter = pLimit(this.concurrentLimit);
    this.priorities = {
      immediate: 0,
      high: 1,
      medium: 2,
      low: 3
    };
  }

  async add(jobName, jobConfig) {
    const job = {
      id: `${jobName}-${Date.now()}`,
      name: jobName,
      config: jobConfig,
      priority: this.priorities[jobConfig.priority] || 2,
      attempts: 0,
      maxAttempts: 3,
      addedAt: new Date(),
      status: 'queued'
    };

    // Insert into queue based on priority
    const insertIndex = this.queue.findIndex(queuedJob => queuedJob.priority > job.priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    logger.info(`📝 Job queued: ${jobName}`, {
      jobId: job.id,
      priority: jobConfig.priority,
      queueSize: this.queue.length
    });

    // Start processing if not already running
    if (!this.running) {
      this.processQueue();
    }

    return job.id;
  }

  async processQueue() {
    if (this.running || this.queue.length === 0) return;

    this.running = true;
    logger.info(`🏃 Starting queue processing with ${this.queue.length} jobs`);

    while (this.queue.length > 0) {
      const job = this.queue.shift();

      // Use limiter to control concurrency
      this.limiter(() => this.executeJob(job))
        .catch(error => {
          logger.error(`Queue processing error for job ${job.name}:`, error);
        });
    }

    // Wait for all concurrent jobs to complete
    await this.limiter.onEmpty();

    this.running = false;
    logger.info('✅ Queue processing completed');
  }

  async executeJob(job) {
    let syncJobId = null;

    try {
      job.status = 'running';
      job.startedAt = new Date();
      job.attempts++;

      logJobStart(job.name, {
        jobId: job.id,
        attempt: job.attempts,
        priority: job.config.priority
      });

      // Record in database
      syncJobId = await db.recordSyncJob(job.name, job.config.jobType || 'unknown', {
        jobId: job.id,
        priority: job.config.priority,
        endpoints: job.config.endpoints
      });

      // Execute the actual job handler
      const result = await job.config.handler();

      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = job.completedAt - job.startedAt;

      // Update database record
      if (syncJobId) {
        await db.updateSyncJob(syncJobId, {
          status: 'completed',
          duration_seconds: Math.round(job.duration / 1000),
          records_processed: result?.recordsProcessed || 0,
          records_created: result?.recordsCreated || 0,
          records_updated: result?.recordsUpdated || 0
        });
      }

      logJobComplete(job.name, {
        jobId: job.id,
        duration: job.duration,
        ...result
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      // Update database record
      if (syncJobId) {
        await db.updateSyncJob(syncJobId, {
          status: 'failed',
          error_message: error.message,
          error_details: JSON.stringify({
            stack: error.stack,
            attempt: job.attempts
          }),
          retry_count: job.attempts - 1
        });
      }

      logJobError(job.name, error, {
        jobId: job.id,
        attempt: job.attempts
      });

      // Retry logic
      if (job.attempts < job.maxAttempts) {
        logger.info(`🔄 Retrying job ${job.name} (attempt ${job.attempts + 1}/${job.maxAttempts})`);

        // Add back to queue with exponential backoff
        setTimeout(() => {
          this.add(job.name, {
            ...job.config,
            priority: 'high' // Boost priority for retries
          });
        }, Math.pow(2, job.attempts) * 1000); // 2s, 4s, 8s delays
      } else {
        logger.error(`💀 Job ${job.name} failed permanently after ${job.attempts} attempts`);
      }
    }
  }

  async start() {
    logger.info(`🚀 Job queue started with concurrency limit: ${this.concurrentLimit}`);
  }

  async stop() {
    logger.info('🛑 Stopping job queue...');

    // Wait for current jobs to complete
    await this.limiter.onEmpty();

    // Clear remaining queue
    this.queue = [];
    this.running = false;

    logger.info('✅ Job queue stopped');
  }

  getStatus() {
    return {
      running: this.running,
      queueSize: this.queue.length,
      concurrentLimit: this.concurrentLimit,
      activeJobs: this.limiter.activeCount,
      pendingJobs: this.limiter.pendingCount,
      queue: this.queue.map(job => ({
        id: job.id,
        name: job.name,
        priority: Object.keys(this.priorities)[job.priority],
        status: job.status,
        attempts: job.attempts,
        addedAt: job.addedAt
      }))
    };
  }
}

export const jobQueue = new JobQueue();