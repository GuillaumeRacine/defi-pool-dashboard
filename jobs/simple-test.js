/**
 * Simple Supabase Test
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

console.log('🔍 Testing Supabase connection...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Key:', supabaseKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

try {
  const { data, error } = await supabase
    .from('sync_jobs')
    .select('id')
    .limit(1);

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('⚠️ Database connected but sync_jobs table not found');
      console.log('   This is normal if schema is not initialized yet');
    } else {
      console.log('❌ Supabase error:', error.message);
    }
  } else {
    console.log('✅ Supabase connection successful!');
    console.log('📊 sync_jobs count:', data ? data.length : 0);
  }
} catch (err) {
  console.log('❌ Connection failed:', err.message);
}

console.log('🏁 Test completed');