#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = 'http://agritech-supabase-652186-5-75-154-125.traefik.me'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function createStructuresTable() {
  console.log('🏗️  Creating structures table...')
  
  const createTableSQL = `
    -- Create structures table for farm infrastructure management
    CREATE TABLE IF NOT EXISTS public.structures (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('stable', 'technical_room', 'basin', 'well')),
        location JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
        installation_date DATE NOT NULL,
        condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
        usage TEXT,
        structure_details JSONB DEFAULT '{}',
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  
  try {
    // Execute the SQL to create the table
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    
    if (error) {
      console.log('❌ Error creating table:', error.message)
      console.log('💡 Trying alternative approach...')
      
      // Alternative: Try to create via direct SQL execution
      const { error: altError } = await supabase
        .from('_sql')
        .select('*')
        .eq('query', createTableSQL)
      
      if (altError) {
        console.log('❌ Alternative approach failed:', altError.message)
        console.log('')
        console.log('📋 Manual steps required:')
        console.log('1. Go to your Supabase Dashboard: http://agritech-supabase-652186-5-75-154-125.traefik.me/project/default/sql')
        console.log('2. Copy and paste the following SQL:')
        console.log('')
        console.log(createTableSQL)
        console.log('')
        console.log('3. Execute the SQL')
        console.log('4. Then run: node refresh-schema-cache.js')
      }
    } else {
      console.log('✅ Structures table created successfully!')
      
      // Now create indexes and policies
      console.log('🔧 Creating indexes and policies...')
      
      const createIndexesSQL = `
        CREATE INDEX IF NOT EXISTS idx_structures_organization_id ON public.structures(organization_id);
        CREATE INDEX IF NOT EXISTS idx_structures_farm_id ON public.structures(farm_id);
        CREATE INDEX IF NOT EXISTS idx_structures_type ON public.structures(type);
      `
      
      const createPoliciesSQL = `
        ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can manage structures from their organization" ON public.structures
          FOR ALL USING (
            organization_id IN (
              SELECT organization_id
              FROM public.organization_users
              WHERE user_id = auth.uid() AND is_active = true
            )
          );
      `
      
      // Execute indexes
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexesSQL })
      if (indexError) {
        console.log('⚠️  Index creation failed:', indexError.message)
      } else {
        console.log('✅ Indexes created successfully!')
      }
      
      // Execute policies
      const { error: policyError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL })
      if (policyError) {
        console.log('⚠️  Policy creation failed:', policyError.message)
      } else {
        console.log('✅ RLS policies created successfully!')
      }
      
      // Test the table
      console.log('🧪 Testing table access...')
      const { data: testData, error: testError } = await supabase
        .from('structures')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.log('❌ Table test failed:', testError.message)
      } else {
        console.log('✅ Table is accessible!')
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

// Run the creation
createStructuresTable().catch(console.error)
