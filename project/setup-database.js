#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://agritech-supabase-652186-5-75-154-125.traefik.me'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function setupDatabase() {
  console.log('🚀 Setting up AgriTech database...')
  console.log(`📡 Connecting to: ${SUPABASE_URL}`)
  
  try {
    // Read the complete setup SQL file
    const sqlPath = path.join(__dirname, 'supabase', 'schemas', '00_complete_setup.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Executing complete database setup...')
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    let successCount = 0
    let errorCount = 0
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`  Executing: ${statement.substring(0, 50)}...`)
          
          const { error } = await supabase.rpc('exec_sql', { 
            sql: statement 
          })
          
          if (error) {
            console.error(`❌ Error: ${error.message}`)
            errorCount++
          } else {
            console.log(`  ✅ Success`)
            successCount++
          }
        } catch (err) {
          console.error(`❌ Exception: ${err.message}`)
          errorCount++
        }
      }
    }
    
    console.log('\n📊 Setup Summary:')
    console.log(`  ✅ Successful statements: ${successCount}`)
    console.log(`  ❌ Failed statements: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n🎉 Database setup completed successfully!')
      console.log('🔗 Your AgriTech platform is ready to use!')
    } else {
      console.log('\n⚠️  Setup completed with some errors.')
      console.log('💡 Some statements may have failed due to existing data or permissions.')
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Run setup
setupDatabase().catch(console.error)
