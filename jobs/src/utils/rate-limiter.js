/**
 * Rate Limiter for API Calls
 * Ensures we don't overwhelm external APIs
 */

import { logger } from './logger.js';

class RateLimiter {
  constructor(delayMs = 200) {
    this.delayMs = parseInt(process.env.API_RATE_LIMIT_MS || delayMs);
    this.lastCall = 0;
    this.callCount = 0;
    this.startTime = Date.now();
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;

    if (timeSinceLastCall < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCall = Date.now();
    this.callCount++;

    // Log rate limiting stats every 100 calls
    if (this.callCount % 100 === 0) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const rate = this.callCount / elapsed;
      logger.debug(`🐌 Rate limiter stats: ${this.callCount} calls in ${elapsed.toFixed(1)}s (${rate.toFixed(2)} calls/sec)`);
    }
  }

  getStats() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return {
      totalCalls: this.callCount,
      elapsedSeconds: elapsed,
      callsPerSecond: this.callCount / elapsed,
      delayMs: this.delayMs
    };
  }
}

export const rateLimiter = new RateLimiter();