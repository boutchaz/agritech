#!/usr/bin/env tsx
/**
 * Clean Remote Supabase Database
 * WARNING: This will delete ALL data and schema from your remote database!
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ANSI colors
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  reset: '\x1b[0m'
};

// Load environment variables
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    });
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`${colors.red}❌ Missing required environment variables:${colors.reset}`);
  console.error('   VITE_SUPABASE_URL (or SUPABASE_URL)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these in your .env file');
  process.exit(1);
}

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function executeSQL(sql: string, description: string) {
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`   Executing: ${description}...`);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    // Try alternative method - using REST API directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql_query: sql })
    });
    
    if (!response.ok) {
      console.error(`${colors.red}   ❌ Error: ${error.message}${colors.reset}`);
      return false;
    }
  }
  
  console.log(`${colors.green}   ✓ ${description} completed${colors.reset}`);
  return true;
}

async function cleanDatabase() {
  console.log(`${colors.red}⚠️  WARNING: DESTRUCTIVE OPERATION ⚠️${colors.reset}\n`);
  console.log('This script will:');
  console.log('  1. Drop ALL tables in the public schema');
  console.log('  2. Drop ALL functions');
  console.log('  3. Drop ALL types/enums');
  console.log('  4. Clear ALL auth users');
  console.log('  5. Apply fresh schema from supabase/schema/public.sql\n');
  console.log(`${colors.yellow}Your remote database URL:${colors.reset}`);
  console.log(`  ${SUPABASE_URL}\n`);

  const confirm1 = await question('Are you ABSOLUTELY sure you want to clean the remote database? (type \'yes\' to continue): ');
  if (confirm1.trim() !== 'yes') {
    console.log(`${colors.green}✓ Operation cancelled. Your database is safe.${colors.reset}`);
    rl.close();
    process.exit(0);
  }

  const confirm2 = await question('Last chance! Type \'DELETE EVERYTHING\' to proceed: ');
  if (confirm2.trim() !== 'DELETE EVERYTHING') {
    console.log(`${colors.green}✓ Operation cancelled. Your database is safe.${colors.reset}`);
    rl.close();
    process.exit(0);
  }

  console.log(`\n${colors.yellow}🧹 Starting database cleanup...${colors.reset}\n`);

  // Create a Supabase client with service role
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test connection
  console.log('Testing connection...');
  const { error: testError } = await supabase.from('_test').select('*').limit(1);
  if (testError && !testError.message.includes('does not exist')) {
    console.log(`${colors.green}✓ Connection successful${colors.reset}\n`);
  }

  console.log(`${colors.yellow}📦 Step 1: Cleaning database via SQL Editor...${colors.reset}\n`);
  
  // Generate cleanup SQL
  const cleanupSQL = `
-- Disable all triggers temporarily
SET session_replication_role = replica;

-- Drop all tables in public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- Drop all views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', r.viewname;
    END LOOP;
END $$;

-- Drop all functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes
              FROM pg_proc INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
              WHERE pg_namespace.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
        RAISE NOTICE 'Dropped function: %', r.proname;
    END LOOP;
END $$;

-- Drop all types/enums
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        RAISE NOTICE 'Dropped type: %', r.typname;
    END LOOP;
END $$;

-- Drop all sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequencename;
    END LOOP;
END $$;

-- Clear all auth users (DANGEROUS - removes all user accounts)
TRUNCATE auth.users CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Vacuum to clean up
VACUUM FULL;
  `.trim();

  // Save SQL to a temporary file for manual execution
  const sqlFilePath = path.join(process.cwd(), 'scripts', 'temp-cleanup.sql');
  fs.writeFileSync(sqlFilePath, cleanupSQL);

  console.log(`${colors.yellow}⚠️  Direct SQL execution via API not available.${colors.reset}`);
  console.log(`\n${colors.yellow}Please execute the cleanup manually:${colors.reset}\n`);
  console.log(`1. Open your Supabase Dashboard SQL Editor:`);
  console.log(`   ${SUPABASE_URL}/project/default/sql\n`);
  console.log(`2. Copy and paste the SQL from:`);
  console.log(`   ${colors.green}${sqlFilePath}${colors.reset}\n`);
  console.log(`3. Or copy this SQL directly:\n`);
  console.log(`${colors.yellow}${'='.repeat(80)}${colors.reset}`);
  console.log(cleanupSQL);
  console.log(`${colors.yellow}${'='.repeat(80)}${colors.reset}\n`);

  const proceed = await question('Press Enter after running the SQL in the dashboard, or type \'skip\' to cancel: ');
  
  if (proceed.trim().toLowerCase() === 'skip') {
    console.log(`${colors.yellow}⚠️  Database cleanup skipped.${colors.reset}`);
    rl.close();
    return;
  }

  // Apply fresh schema if it exists
  console.log(`\n${colors.yellow}📦 Step 2: Applying fresh schema...${colors.reset}\n`);

  const schemaPath = path.join(process.cwd(), 'supabase', 'schema', 'public.sql');
  const altSchemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');

  let schemaFile: string | null = null;
  if (fs.existsSync(schemaPath)) {
    schemaFile = schemaPath;
  } else if (fs.existsSync(altSchemaPath)) {
    schemaFile = altSchemaPath;
  }

  if (schemaFile) {
    const schemaSQL = fs.readFileSync(schemaFile, 'utf-8');
    const schemaTempPath = path.join(process.cwd(), 'scripts', 'temp-schema.sql');
    fs.writeFileSync(schemaTempPath, schemaSQL);

    console.log(`${colors.yellow}Please apply the schema manually:${colors.reset}\n`);
    console.log(`1. Open SQL Editor: ${SUPABASE_URL}/project/default/sql`);
    console.log(`2. Copy contents from: ${colors.green}${schemaFile}${colors.reset}`);
    console.log(`3. Execute in the SQL Editor\n`);

    await question('Press Enter after applying the schema...');
  } else {
    console.log(`${colors.yellow}⚠️  No schema file found. Skipping schema application.${colors.reset}`);
  }

  console.log(`\n${colors.green}✅ Database cleanup process completed!${colors.reset}\n`);
  console.log('Next steps:');
  console.log('  1. Verify tables in dashboard');
  console.log('  2. Generate types: npm run db:generate-types-remote');
  console.log('  3. Test your app: npm run dev\n');

  rl.close();
}

cleanDatabase().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  rl.close();
  process.exit(1);
});

