#!/usr/bin/env node

/**
 * Apply RLS policies for user_profiles and dashboard_settings tables
 * These tables had RLS enabled but no policies, blocking all access
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function applyMigration() {
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('📝 Reading migration file...');
  const migrationPath = path.join(__dirname, 'supabase/migrations/20251106000001_add_user_profiles_dashboard_settings_rls.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  console.log('🔧 Applying RLS policies for user_profiles and dashboard_settings...');

  // Split by semicolons and execute each statement
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.trim().length === 0) continue;

    console.log(`   Executing: ${statement.substring(0, 60)}...`);

    const { data, error } = await supabase.rpc('exec', {
      sql: statement + ';'
    });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Success`);
    }
  }

  console.log('\n✅ Migration applied successfully!');
  console.log('\n📋 Summary:');
  console.log('   - Added RLS policies for user_profiles (SELECT, INSERT, UPDATE)');
  console.log('   - Added RLS policies for dashboard_settings (SELECT, INSERT, UPDATE, DELETE)');
  console.log('\n🎉 Users should now be able to access their profiles and dashboard settings!');
}

applyMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
