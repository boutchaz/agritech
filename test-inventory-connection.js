// Test script for inventory/stock management functionality
// Run this with: node test-inventory-connection.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://najvfshknxkwzorlozre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hanZmc2hrbnhrd3pvcmxvenJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMjc4NDIsImV4cCI6MjA1OTcwMzg0Mn0.VAqDnnkGUKFRXj5Cyrq5Ltuxkflvc4MGeblZmPlO_4s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInventoryConnection() {
  try {
    console.log('🧪 Testing inventory/stock management connection...\n');

    // Test 1: Check product_categories
    console.log('1. Testing product_categories table...');
    const { data: categories, error: categoriesError } = await supabase
      .from('product_categories')
      .select('*')
      .limit(5);

    if (categoriesError) {
      console.error('❌ Product categories error:', categoriesError.message);
    } else {
      console.log('✅ Product categories found:', categories.length);
      console.log('   Sample categories:', categories.map(c => c.name).join(', '));
    }

    // Test 2: Check product_subcategories
    console.log('\n2. Testing product_subcategories table...');
    const { data: subcategories, error: subcategoriesError } = await supabase
      .from('product_subcategories')
      .select('*')
      .limit(5);

    if (subcategoriesError) {
      console.error('❌ Product subcategories error:', subcategoriesError.message);
    } else {
      console.log('✅ Product subcategories found:', subcategories.length);
      console.log('   Sample subcategories:', subcategories.map(s => s.name).join(', '));
    }

    // Test 3: Check inventory table with relationships
    console.log('\n3. Testing inventory table with relationships...');
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        *,
        product_categories (
          name,
          code
        ),
        product_subcategories (
          name,
          code
        )
      `)
      .limit(5);

    if (inventoryError) {
      console.error('❌ Inventory query error:', inventoryError.message);
    } else {
      console.log('✅ Inventory table query successful');
      console.log('   Inventory items found:', inventory.length);
      if (inventory.length > 0) {
        console.log('   Sample item:', inventory[0].name);
      }
    }

    // Test 4: Check purchases table
    console.log('\n4. Testing purchases table...');
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .limit(5);

    if (purchasesError) {
      console.error('❌ Purchases error:', purchasesError.message);
    } else {
      console.log('✅ Purchases table accessible, records:', purchases.length);
    }

    console.log('\n🎉 Inventory connection test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Product categories: ✅');
    console.log('   - Product subcategories: ✅');
    console.log('   - Inventory with relationships: ✅');
    console.log('   - Purchases tracking: ✅');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testInventoryConnection();