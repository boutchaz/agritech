#!/usr/bin/env node

/**
 * Apply RLS policies for user_profiles and dashboard_settings tables
 * Using direct PostgreSQL connection
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function applyMigration() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: false
  });

  try {
    console.log('📝 Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20251106000001_add_user_profiles_dashboard_settings_rls.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔧 Applying RLS policies...');
    console.log(`   Connecting to: ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`);

    const client = await pool.connect();

    try {
      // Execute the entire migration
      await client.query(sqlContent);
      console.log('✅ Migration applied successfully!');
      console.log('\n📋 Summary:');
      console.log('   - Added RLS policies for user_profiles (SELECT, INSERT, UPDATE)');
      console.log('   - Added RLS policies for dashboard_settings (SELECT, INSERT, UPDATE, DELETE)');
      console.log('\n🎉 Users should now be able to access their profiles and dashboard settings!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
