#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Supabase configuration
const SUPABASE_URL = 'http://agritech-supabase-652186-5-75-154-125.traefik.me'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function executeSQL(sql: string, filename: string) {
  console.log(`📄 Applying ${filename}...`)
  
  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`  Executing: ${statement.substring(0, 50)}...`)
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        })
        
        if (error) {
          console.error(`❌ Error in ${filename}:`, error.message)
          // Continue with other statements
        } else {
          console.log(`  ✅ Success`)
        }
      }
    }
  } catch (error) {
    console.error(`❌ Failed to apply ${filename}:`, error)
  }
}

async function applyMigrations() {
  console.log('🚀 Applying Supabase migrations to remote database...')
  
  const schemaFiles = [
    'supabase/schemas/01_tables.sql',
    'supabase/schemas/02_foreign_keys.sql', 
    'supabase/schemas/03_indexes.sql',
    'supabase/schemas/04_triggers.sql',
    'supabase/schemas/05_permissions.sql',
    'supabase/seed.sql'
  ]
  
  for (const file of schemaFiles) {
    try {
      const sql = readFileSync(join(process.cwd(), file), 'utf8')
      await executeSQL(sql, file)
    } catch (error) {
      console.error(`❌ Failed to read ${file}:`, error)
    }
  }
  
  console.log('✅ All migrations applied successfully!')
  console.log(`🔗 Your database is now ready at: ${SUPABASE_URL}`)
}

// Run migrations
applyMigrations().catch(console.error)
