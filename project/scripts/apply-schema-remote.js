#!/usr/bin/env node

/**
 * Script to apply declarative schema to remote self-hosted Supabase
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_HOST = process.env.POSTGRES_HOST;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;

// Database connection details for direct SQL execution
const DB_CONFIG = {
  host: SUPABASE_HOST,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: POSTGRES_PASSWORD
};

function checkRequirements() {
  if (!SUPABASE_HOST) {
    console.error('❌ POSTGRES_HOST not found in .env');
    return false;
  }

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
    return false;
  }

  // Check if psql is available for direct database connection
  try {
    execSync('psql --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('❌ psql not found. Please install PostgreSQL client.');
    console.error('On macOS: brew install postgresql');
    console.error('On Ubuntu: sudo apt-get install postgresql-client');
    return false;
  }
}

function applySchema() {
  try {
    console.log('🔄 Applying schema to remote Supabase...');
    console.log(`📡 Target: ${SUPABASE_HOST}`);

    const schemaPath = path.join(__dirname, '../supabase/schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }

    // Build psql connection string
    const connectionString = `postgresql://postgres:${POSTGRES_PASSWORD}@${SUPABASE_HOST}:5432/postgres`;

    // Apply schema using psql
    const command = `psql "${connectionString}" -f "${schemaPath}"`;

    console.log('⚡ Executing schema...');
    execSync(command, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: POSTGRES_PASSWORD }
    });

    console.log('✅ Schema applied successfully!');

  } catch (error) {
    console.error('❌ Error applying schema:', error.message);

    // Provide alternative approach
    console.log('\n🔄 Alternative: Apply schema manually');
    console.log('1. Copy the contents of supabase/schema.sql');
    console.log(`2. Go to ${SUPABASE_HOST}/project/default/sql`);
    console.log('3. Paste and execute the SQL');

    process.exit(1);
  }
}

function applySeedData() {
  try {
    console.log('🌱 Applying seed data...');

    const seedPath = path.join(__dirname, '../supabase/seed.sql');

    if (!fs.existsSync(seedPath)) {
      console.log('⚠️ No seed file found, skipping seed data');
      return;
    }

    // Build psql connection string
    const connectionString = `postgresql://postgres:${POSTGRES_PASSWORD}@${SUPABASE_HOST}:5432/postgres`;

    // Apply seed data using psql
    const command = `psql "${connectionString}" -f "${seedPath}"`;

    execSync(command, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: POSTGRES_PASSWORD }
    });

    console.log('✅ Seed data applied successfully!');

  } catch (error) {
    console.error('❌ Error applying seed data:', error.message);
    console.log('⚠️ Schema was applied, but seed data failed. You can apply it manually later.');
  }
}

function main() {
  console.log('🚀 Remote Supabase Schema Deployment');
  console.log('=====================================');

  if (!checkRequirements()) {
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const includeSeed = args.includes('--seed') || args.includes('-s');

  applySchema();

  if (includeSeed) {
    applySeedData();
  }

  console.log('\n🎉 Deployment complete!');
  console.log(`📊 Dashboard: http://${SUPABASE_HOST}/project/default`);
  console.log('📝 Next: Run npm run generate-types-remote to update TypeScript types');
}

// Check if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { applySchema, applySeedData };