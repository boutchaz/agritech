// Simple script to test Supabase connection
// Run this with: node test-supabase-connection.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://najvfshknxkwzorlozre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hanZmc2hrbnhrd3pvcmxvenJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMjc4NDIsImV4cCI6MjA1OTcwMzg0Mn0.VAqDnnkGUKFRXj5Cyrq5Ltuxkflvc4MGeblZmPlO_4s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');

    // Test 1: Check if we can connect to task_categories
    const { data: categories, error: categoriesError } = await supabase
      .from('task_categories')
      .select('*')
      .limit(5);

    if (categoriesError) {
      console.error('❌ Task categories error:', categoriesError.message);
    } else {
      console.log('✅ Task categories found:', categories.length);
    }

    // Test 2: Check if we can connect to crop_types
    const { data: cropTypes, error: cropTypesError } = await supabase
      .from('crop_types')
      .select('*')
      .limit(5);

    if (cropTypesError) {
      console.error('❌ Crop types error:', cropTypesError.message);
    } else {
      console.log('✅ Crop types found:', cropTypes.length);
    }

    // Test 3: Check farms table
    const { data: farms, error: farmsError } = await supabase
      .from('farms')
      .select('*')
      .limit(5);

    if (farmsError) {
      console.error('❌ Farms error:', farmsError.message);
    } else {
      console.log('✅ Farms table accessible, records:', farms.length);
    }

    console.log('\n🎉 Connection test completed!');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();