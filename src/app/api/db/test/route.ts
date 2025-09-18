/**
 * Database Test API Route
 * Tests connection and basic operations
 */

import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/supabase';
import { getRecentSyncJobs, getChainStats, getTopPools } from '@/lib/database';

export async function GET() {
  try {
    // Test database connection
    const isConnected = await testDatabaseConnection();

    if (!isConnected) {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Try to fetch some data
    const [syncJobs, chainStats, topPools] = await Promise.all([
      getRecentSyncJobs(5),
      getChainStats(),
      getTopPools(1000000, 10)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        syncJobsCount: syncJobs.length,
        chainStatsCount: chainStats.length,
        topPoolsCount: topPools.length,
        syncJobs,
        chainStats,
        topPools
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}