/**
 * Test Supabase Database Connection
 */

import dotenv from 'dotenv';
import { supabaseDb } from './src/utils/supabase-database.js';
import { logger } from './src/utils/logger.js';

// Load environment variables
dotenv.config();

async function testSupabaseConnection() {
  console.log('\n🚀 DeFi Data Warehouse - Supabase Connection Test\n');
  console.log('==================================================');

  try {
    // Test connection
    console.log('🔍 Testing Supabase connection...');
    const isConnected = await supabaseDb.testConnection();

    if (!isConnected) {
      console.log('❌ Supabase connection failed!');
      process.exit(1);
    }

    // Get table counts
    console.log('📊 Checking table data...');
    const counts = await supabaseDb.getTableCounts();

    console.log('📈 Database Statistics:');
    console.log(`   • Pools: ${counts.pools}`);
    console.log(`   • Protocols: ${counts.protocols}`);
    console.log(`   • Sync Jobs: ${counts.sync_jobs}`);

    // Get recent sync jobs
    const recentJobs = await supabaseDb.getRecentSyncJobs(5);
    console.log(`\n📝 Recent Sync Jobs (${recentJobs.length}):`);

    if (recentJobs.length === 0) {
      console.log('   • No sync jobs found - database is ready for initial sync');
    } else {
      recentJobs.forEach(job => {
        console.log(`   • ${job.job_type}: ${job.status} (${job.records_processed} records)`);
      });
    }

    console.log('\n✅ Supabase connection test completed successfully!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\n📝 Troubleshooting:');
    console.log('• Check SUPABASE_URL and SUPABASE_ANON_KEY in .env');
    console.log('• Ensure database schema is initialized');
    console.log('• Verify Supabase project is active');
    console.log('==================================================\n');
    process.exit(1);
  }
}

// Run the test
testSupabaseConnection();