#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = 'http://agritech-supabase-652186-5-75-154-125.traefik.me'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function refreshSchemaCache() {
  console.log('🔄 Refreshing PostgREST schema cache...')
  
  try {
    // Try to trigger a schema reload by making a simple query
    const { data, error } = await supabase
      .from('structures')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('❌ Error accessing structures table:', error.message)
      
      if (error.code === 'PGRST116') {
        console.log('📋 The structures table is not visible to PostgREST.')
        console.log('🔧 This usually means:')
        console.log('   1. The table exists but PostgREST cache is stale')
        console.log('   2. RLS policies are blocking access')
        console.log('   3. The table needs to be created')
        console.log('')
        console.log('💡 Solutions:')
        console.log('   1. Restart the Supabase instance to refresh cache')
        console.log('   2. Run the structures table creation SQL manually')
        console.log('   3. Check RLS policies in the dashboard')
      }
    } else {
      console.log('✅ Structures table is accessible!')
      console.log('📊 Sample data:', data)
    }
    
    // Also try to refresh the schema by calling the reload function
    console.log('🔄 Attempting to trigger schema reload...')
    const { error: reloadError } = await supabase.rpc('reload_schema')
    
    if (reloadError) {
      console.log('⚠️  Could not trigger schema reload:', reloadError.message)
    } else {
      console.log('✅ Schema reload triggered successfully!')
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

// Run the refresh
refreshSchemaCache().catch(console.error)
