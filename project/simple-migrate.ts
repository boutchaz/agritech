#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Supabase configuration
const SUPABASE_URL = 'http://agritech-supabase-652186-5-75-154-125.traefik.me'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function createTables() {
  console.log('🚀 Creating database tables...')
  
  // Create test_types table
  console.log('📄 Creating test_types table...')
  const { error: testTypesError } = await supabase
    .from('test_types')
    .select('id')
    .limit(1)
  
  if (testTypesError && testTypesError.code === 'PGRST116') {
    console.log('  Creating test_types table...')
    // Table doesn't exist, we need to create it via SQL
    console.log('  ⚠️  Please run the SQL manually in Supabase Dashboard')
    console.log('  📋 Copy the contents of supabase/schemas/01_tables.sql')
  } else {
    console.log('  ✅ test_types table already exists')
  }
  
  // Check soil_analyses table
  console.log('📄 Checking soil_analyses table...')
  const { error: soilAnalysesError } = await supabase
    .from('soil_analyses')
    .select('id')
    .limit(1)
  
  if (soilAnalysesError && soilAnalysesError.code === 'PGRST116') {
    console.log('  ⚠️  soil_analyses table does not exist')
    console.log('  📋 Please run the SQL manually in Supabase Dashboard')
  } else {
    console.log('  ✅ soil_analyses table exists')
  }
  
  // Check structures table
  console.log('📄 Checking structures table...')
  const { error: structuresError } = await supabase
    .from('structures')
    .select('id')
    .limit(1)
  
  if (structuresError && structuresError.code === 'PGRST116') {
    console.log('  ⚠️  structures table does not exist')
    console.log('  📋 Please run the SQL manually in Supabase Dashboard')
  } else {
    console.log('  ✅ structures table exists')
  }
  
  console.log('\n📋 To create the tables, please:')
  console.log('1. Go to your Supabase Dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy and paste the contents of each schema file:')
  console.log('   - supabase/schemas/01_tables.sql')
  console.log('   - supabase/schemas/02_foreign_keys.sql')
  console.log('   - supabase/schemas/03_indexes.sql')
  console.log('   - supabase/schemas/04_triggers.sql')
  console.log('   - supabase/schemas/05_permissions.sql')
  console.log('   - supabase/seed.sql')
  console.log('4. Run each SQL script in order')
}

// Run migration check
createTables().catch(console.error)
