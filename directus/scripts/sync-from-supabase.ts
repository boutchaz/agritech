#!/usr/bin/env tsx

import { createAdminClient } from '../config';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../project/.env') });

const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!DIRECTUS_ADMIN_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const directus = createAdminClient(DIRECTUS_ADMIN_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncTreeCategories() {
  console.log('🌳 Syncing tree categories from Supabase to Directus...\n');

  try {
    // Fetch from Supabase
    const { data: categories, error: categoriesError } = await supabase
      .from('tree_categories')
      .select('*');

    if (categoriesError) throw categoriesError;

    const { data: trees, error: treesError } = await supabase
      .from('trees')
      .select('*');

    if (treesError) throw treesError;

    console.log(`📊 Found ${categories?.length || 0} categories and ${trees?.length || 0} trees in Supabase`);

    // Sync categories to Directus
    for (const category of categories || []) {
      try {
        await directus.request({
          method: 'POST',
          path: '/items/tree_categories',
          body: JSON.stringify({
            id: category.id,
            category: category.category,
            organization_id: category.organization_id,
            status: 'published',
            date_created: category.created_at,
            date_updated: category.updated_at
          })
        } as any);

        console.log(`  ✅ Synced category: ${category.category}`);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`  ⚠️  Category ${category.category} already exists, updating...`);

          await directus.request({
            method: 'PATCH',
            path: `/items/tree_categories/${category.id}`,
            body: JSON.stringify({
              category: category.category,
              organization_id: category.organization_id,
              date_updated: category.updated_at
            })
          } as any);
        } else {
          console.error(`  ❌ Error syncing category ${category.category}:`, error.message);
        }
      }
    }

    // Sync trees to Directus
    for (const tree of trees || []) {
      try {
        await directus.request({
          method: 'POST',
          path: '/items/trees',
          body: JSON.stringify({
            id: tree.id,
            name: tree.name,
            category_id: tree.category_id,
            status: 'published',
            date_created: tree.created_at,
            date_updated: tree.updated_at
          })
        } as any);

        console.log(`  ✅ Synced tree: ${tree.name}`);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          await directus.request({
            method: 'PATCH',
            path: `/items/trees/${tree.id}`,
            body: JSON.stringify({
              name: tree.name,
              category_id: tree.category_id,
              date_updated: tree.updated_at
            })
          } as any);
        } else {
          console.error(`  ❌ Error syncing tree ${tree.name}:`, error.message);
        }
      }
    }

    console.log('\n✨ Tree categories synced successfully!');
  } catch (error) {
    console.error('❌ Error syncing tree categories:', error);
    throw error;
  }
}

async function syncPlantationTypes() {
  console.log('\n🌾 Syncing plantation types from Supabase to Directus...\n');

  try {
    const { data: plantationTypes, error } = await supabase
      .from('plantation_types')
      .select('*');

    if (error) throw error;

    console.log(`📊 Found ${plantationTypes?.length || 0} plantation types in Supabase`);

    for (const type of plantationTypes || []) {
      try {
        await directus.request({
          method: 'POST',
          path: '/items/plantation_types',
          body: JSON.stringify({
            id: type.id,
            type: type.type,
            spacing: type.spacing,
            trees_per_ha: type.trees_per_ha,
            organization_id: type.organization_id,
            status: 'published',
            date_created: type.created_at,
            date_updated: type.updated_at
          })
        } as any);

        console.log(`  ✅ Synced plantation type: ${type.type} (${type.spacing})`);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`  ⚠️  Plantation type ${type.type} already exists, updating...`);

          await directus.request({
            method: 'PATCH',
            path: `/items/plantation_types/${type.id}`,
            body: JSON.stringify({
              type: type.type,
              spacing: type.spacing,
              trees_per_ha: type.trees_per_ha,
              organization_id: type.organization_id,
              date_updated: type.updated_at
            })
          } as any);
        } else {
          console.error(`  ❌ Error syncing plantation type ${type.type}:`, error.message);
        }
      }
    }

    console.log('\n✨ Plantation types synced successfully!');
  } catch (error) {
    console.error('❌ Error syncing plantation types:', error);
    throw error;
  }
}

async function main() {
  console.log('🔄 Starting Supabase → Directus sync...\n');

  try {
    await syncTreeCategories();
    await syncPlantationTypes();

    console.log('\n✨ All data synced successfully!');
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
