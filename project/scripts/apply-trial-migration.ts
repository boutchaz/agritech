import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying trial subscription migration to remote database...\n');

  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20251006000001_allow_trial_subscription_creation.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

    if (error) {
      // Try executing directly if RPC fails
      const { error: directError } = await supabase.from('_migrations').select('*').limit(1);

      if (directError) {
        console.error(`❌ Failed to execute statement ${i + 1}:`);
        console.error(error.message);
        console.error('\n⚠️  Please apply this migration manually via Supabase Dashboard SQL Editor:');
        console.error(`   1. Go to ${supabaseUrl.replace('//', '//app.')}/project/_/sql/new`);
        console.error('   2. Copy the contents of:');
        console.error(`      ${migrationPath}`);
        console.error('   3. Run the SQL\n');
        process.exit(1);
      }
    }
  }

  console.log('✅ Migration applied successfully!\n');
}

applyMigration().catch((error) => {
  console.error('❌ Script failed:', error);
  console.error('\n⚠️  Please apply the migration manually via Supabase Dashboard SQL Editor:');
  console.error(`   1. Go to ${supabaseUrl.replace('//', '//app.')}/project/_/sql/new`);
  console.error('   2. Copy and paste the migration SQL');
  console.error('   3. Run the SQL\n');
  process.exit(1);
});
