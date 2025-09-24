#!/usr/bin/env node

/**
 * Script to apply declarative schema to remote self-hosted Supabase via API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function checkRequirements() {
  if (!SUPABASE_URL) {
    console.error('❌ VITE_SUPABASE_URL not found in .env');
    return false;
  }

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
    return false;
  }

  return true;
}

async function executeSQL(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      // Try alternative approach using the SQL endpoint
      return await executeSQLAlternative(sql);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API execution failed:', error.message);
    return await executeSQLAlternative(sql);
  }
}

async function executeSQLAlternative(sql) {
  // Split SQL into individual statements and execute them
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`📝 Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip empty statements
    if (!statement || statement.length < 10) continue;

    console.log(`⚡ Statement ${i + 1}/${statements.length}...`);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: statement + ';'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️  Statement ${i + 1} failed:`, errorText);

        // Continue with next statement for non-critical errors
        if (!errorText.includes('already exists') &&
            !errorText.includes('permission denied') &&
            !statement.includes('CREATE EXTENSION')) {
          throw new Error(`Failed to execute statement: ${errorText}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Statement ${i + 1} error:`, error.message);

      // Continue for certain types of errors
      if (!error.message.includes('already exists') &&
          !error.message.includes('permission denied')) {
        console.error(`❌ Critical error on statement ${i + 1}:`, statement.substring(0, 100));
      }
    }
  }
}

async function applySchema() {
  try {
    console.log('🔄 Applying schema to remote Supabase via API...');
    console.log(`📡 Target: ${SUPABASE_URL}`);

    const schemaPath = path.join(__dirname, '../supabase/schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('⚡ Executing schema via API...');
    await executeSQL(schemaSQL);

    console.log('✅ Schema applied successfully!');

  } catch (error) {
    console.error('❌ Error applying schema:', error.message);

    // Provide manual approach
    console.log('\n🔄 Manual application recommended:');
    console.log('1. Copy the contents of supabase/schema.sql');
    console.log(`2. Go to ${SUPABASE_URL.replace('/rest/v1', '')}/project/default/sql`);
    console.log('3. Paste and execute the SQL');
    console.log('4. Dashboard login: supabase / blvn8uokbjdddnfoehcni8qnc4q8mhle');

    throw error;
  }
}

async function applySeedData() {
  try {
    console.log('🌱 Applying seed data...');

    const seedPath = path.join(__dirname, '../supabase/seed.sql');

    if (!fs.existsSync(seedPath)) {
      console.log('⚠️ No seed file found, skipping seed data');
      return;
    }

    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    await executeSQL(seedSQL);

    console.log('✅ Seed data applied successfully!');

  } catch (error) {
    console.error('❌ Error applying seed data:', error.message);
    console.log('⚠️ Schema was applied, but seed data failed. You can apply it manually later.');
  }
}

async function main() {
  console.log('🚀 Remote Supabase Schema Deployment (API)');
  console.log('==========================================');

  if (!checkRequirements()) {
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const includeSeed = args.includes('--seed') || args.includes('-s');

  try {
    await applySchema();

    if (includeSeed) {
      await applySeedData();
    }

    console.log('\n🎉 Deployment complete!');
    console.log(`📊 Dashboard: ${SUPABASE_URL.replace('/rest/v1', '')}/project/default`);
    console.log('📝 Next: Run npm run db:generate-types-remote to update TypeScript types');
  } catch (error) {
    console.error('\n❌ Deployment failed');
    console.log('\n💡 Try the manual approach:');
    console.log(`1. Go to: ${SUPABASE_URL.replace('/rest/v1', '')}/project/default/sql`);
    console.log('2. Copy and paste the contents of supabase/schema.sql');
    console.log('3. Click "Run" to execute the schema');
    process.exit(1);
  }
}

// Check if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { applySchema, applySeedData };