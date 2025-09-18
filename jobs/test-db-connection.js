#!/usr/bin/env node

/**
 * Test Database Connection and Setup
 */

import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

async function testConnection() {
  console.log('🔍 Testing Database Connection...\n');

  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'YOUR_SUPABASE_CONNECTION_STRING_HERE') {
    console.error('❌ DATABASE_URL is not configured!');
    console.log('\n📝 To set up the database:');
    console.log('1. Create a free Supabase account at https://supabase.com');
    console.log('2. Create a new project');
    console.log('3. Go to Settings → Database');
    console.log('4. Copy the connection string (URI)');
    console.log('5. Update jobs/.env with your connection string');
    console.log('\nExample format:');
    console.log('DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres');
    return false;
  }

  console.log('✅ DATABASE_URL is configured');
  console.log(`📍 Connection string: ${process.env.DATABASE_URL.substring(0, 30)}...`);

  // Try to connect
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('\n🔌 Attempting to connect to database...');

    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connected successfully!');
    console.log(`⏰ Server time: ${result.rows[0].current_time}`);
    console.log(`📊 PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);

    // Check if our tables exist
    console.log('\n📋 Checking for required tables...');
    const tableCheckQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('protocols', 'pools', 'chains', 'sync_jobs', 'contract_mappings', 'pool_daily_snapshots', 'protocol_daily_snapshots')
      ORDER BY table_name;
    `;

    const tablesResult = await pool.query(tableCheckQuery);

    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No tables found. Database needs to be initialized.');
      console.log('\n📝 To initialize the database:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Click on SQL Editor');
      console.log('3. Paste the contents of database/schema.sql');
      console.log('4. Run the query');
      return false;
    }

    console.log('✅ Found the following tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });

    // Check for recent sync jobs
    console.log('\n📊 Checking sync job history...');
    const syncJobsQuery = `
      SELECT
        job_type,
        COUNT(*) as total_runs,
        MAX(completed_at) as last_run,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_runs
      FROM sync_jobs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY job_type
      ORDER BY last_run DESC NULLS LAST;
    `;

    const syncJobsResult = await pool.query(syncJobsQuery);

    if (syncJobsResult.rows.length === 0) {
      console.log('ℹ️  No sync jobs have been run yet.');
      console.log('\n📝 To run sync jobs:');
      console.log('1. Make sure DATABASE_URL is properly configured in jobs/.env');
      console.log('2. From the jobs directory, run:');
      console.log('   npm start              # Start the scheduler');
      console.log('   npm run sync:protocols # Sync protocols manually');
      console.log('   npm run sync:pools     # Sync pools manually');
    } else {
      console.log('✅ Recent sync job activity:');
      console.table(syncJobsResult.rows.map(row => ({
        'Job Type': row.job_type,
        'Total Runs': row.total_runs,
        'Successful': row.successful_runs,
        'Failed': row.failed_runs,
        'Last Run': row.last_run ? new Date(row.last_run).toLocaleString() : 'Never'
      })));
    }

    // Check data freshness
    console.log('\n⏱️  Checking data freshness...');
    const freshnessQuery = `
      SELECT
        'protocols' as table_name,
        COUNT(*) as row_count,
        MAX(updated_at) as last_updated
      FROM protocols
      UNION ALL
      SELECT
        'pools',
        COUNT(*),
        MAX(updated_at)
      FROM pools
      UNION ALL
      SELECT
        'chains',
        COUNT(*),
        MAX(updated_at)
      FROM chains;
    `;

    const freshnessResult = await pool.query(freshnessQuery);

    console.log('📊 Data status:');
    console.table(freshnessResult.rows.map(row => ({
      'Table': row.table_name,
      'Row Count': row.row_count,
      'Last Updated': row.last_updated ? new Date(row.last_updated).toLocaleString() : 'No data'
    })));

    // Check if data is stale (older than 2 days)
    const staleData = freshnessResult.rows.filter(row => {
      if (!row.last_updated || row.row_count === '0') return true;
      const lastUpdate = new Date(row.last_updated);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      return lastUpdate < twoDaysAgo;
    });

    if (staleData.length > 0) {
      console.log('\n⚠️  Some data appears to be stale or missing:');
      staleData.forEach(row => {
        console.log(`   • ${row.table_name}: ${row.row_count === '0' ? 'No data' : 'Needs update'}`);
      });
      console.log('\n📝 To update data, run the sync jobs as shown above.');
    } else {
      console.log('\n✅ All data is fresh and up to date!');
    }

    await pool.end();
    return true;

  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);

    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n📝 This error usually means:');
      console.log('• The database host is incorrect');
      console.log('• Check your DATABASE_URL in jobs/.env');
    } else if (error.message.includes('password')) {
      console.log('\n📝 This error usually means:');
      console.log('• The database password is incorrect');
      console.log('• Update your DATABASE_URL with the correct password');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n📝 This error usually means:');
      console.log('• The database name is incorrect');
      console.log('• Check the database name in your connection string');
    }

    await pool.end();
    return false;
  }
}

// Run the test
console.log('🚀 DeFi Data Warehouse - Database Connection Test\n');
console.log('=' . repeat(50));
testConnection().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ Database is properly configured and ready!');
    process.exit(0);
  } else {
    console.log('❌ Database setup incomplete. Please follow the instructions above.');
    process.exit(1);
  }
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});