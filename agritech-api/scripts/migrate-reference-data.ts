#!/usr/bin/env ts-node

/**
 * Data Migration Script: Supabase → Strapi
 *
 * Migrates reference data from Supabase to Strapi CMS
 *
 * Usage:
 *   npm run migrate:reference-data
 *
 * Environment variables required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *   STRAPI_API_URL
 *   STRAPI_API_TOKEN
 */

import { createClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const STRAPI_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

if (!STRAPI_TOKEN) {
  console.error('❌ Missing STRAPI_API_TOKEN environment variable');
  console.log('💡 Create an API token in Strapi admin: Settings → API Tokens');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const strapiClient: AxiosInstance = axios.create({
  baseURL: STRAPI_URL,
  headers: {
    'Authorization': `Bearer ${STRAPI_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Utility functions
function logStep(message: string) {
  console.log(`\n🔄 ${message}`);
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

function logError(message: string, error?: any) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(error.response?.data || error.message || error);
  }
}

// Migration functions

async function migrateTestTypes() {
  logStep('Migrating Test Types (Global)');

  try {
    // Fetch from Supabase
    const { data: testTypes, error } = await supabase
      .from('test_types')
      .select('*')
      .order('name');

    if (error) throw error;

    if (!testTypes || testTypes.length === 0) {
      logWarning('No test types found in Supabase');
      return;
    }

    console.log(`   Found ${testTypes.length} test types to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const testType of testTypes) {
      try {
        // Transform to Strapi format
        const strapiData = {
          data: {
            name: testType.name,
            description: testType.description || null,
            parameters: testType.parameters || null,
          },
        };

        // Check if already exists
        const { data: existing } = await strapiClient.get('/test-types', {
          params: {
            filters: { name: { $eq: testType.name } },
          },
        });

        if (existing.data && existing.data.length > 0) {
          console.log(`   ⏭️  Skipping "${testType.name}" (already exists)`);
          continue;
        }

        // Create in Strapi
        await strapiClient.post('/test-types', strapiData);
        successCount++;
        console.log(`   ✓ Migrated: ${testType.name}`);
      } catch (err) {
        errorCount++;
        logError(`Failed to migrate test type: ${testType.name}`, err);
      }
    }

    logSuccess(`Migrated ${successCount} test types (${errorCount} errors)`);
  } catch (error) {
    logError('Failed to migrate test types', error);
    throw error;
  }
}

async function migrateProductCategories() {
  logStep('Migrating Product Categories (Global)');

  try {
    // Fetch from Supabase
    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');

    if (error) throw error;

    if (!categories || categories.length === 0) {
      logWarning('No product categories found in Supabase');
      return;
    }

    console.log(`   Found ${categories.length} product categories to migrate`);

    let successCount = 0;
    let errorCount = 0;
    const categoryMapping: { [key: string]: string } = {};

    for (const category of categories) {
      try {
        const strapiData = {
          data: {
            name: category.name,
            description: category.description || null,
          },
        };

        // Check if already exists
        const { data: existing } = await strapiClient.get('/product-categories', {
          params: {
            filters: { name: { $eq: category.name } },
          },
        });

        let strapiId: string;

        if (existing.data && existing.data.length > 0) {
          strapiId = existing.data[0].id;
          console.log(`   ⏭️  Skipping "${category.name}" (already exists)`);
        } else {
          const response = await strapiClient.post('/product-categories', strapiData);
          strapiId = response.data.data.id;
          successCount++;
          console.log(`   ✓ Migrated: ${category.name}`);
        }

        // Store mapping for subcategories
        categoryMapping[category.id] = strapiId;
      } catch (err) {
        errorCount++;
        logError(`Failed to migrate product category: ${category.name}`, err);
      }
    }

    logSuccess(`Migrated ${successCount} product categories (${errorCount} errors)`);

    // Now migrate subcategories
    await migrateProductSubcategories(categoryMapping);
  } catch (error) {
    logError('Failed to migrate product categories', error);
    throw error;
  }
}

async function migrateProductSubcategories(categoryMapping: { [key: string]: string }) {
  logStep('Migrating Product Subcategories');

  try {
    const { data: subcategories, error } = await supabase
      .from('product_subcategories')
      .select('*')
      .order('name');

    if (error) throw error;

    if (!subcategories || subcategories.length === 0) {
      logWarning('No product subcategories found in Supabase');
      return;
    }

    console.log(`   Found ${subcategories.length} product subcategories to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const subcategory of subcategories) {
      try {
        const strapiCategoryId = categoryMapping[subcategory.category_id];

        if (!strapiCategoryId) {
          logWarning(`No mapping found for category_id: ${subcategory.category_id}`);
          continue;
        }

        const strapiData = {
          data: {
            name: subcategory.name,
            description: subcategory.description || null,
            product_category: strapiCategoryId,
          },
        };

        // Check if already exists
        const { data: existing } = await strapiClient.get('/product-subcategories', {
          params: {
            filters: {
              name: { $eq: subcategory.name },
              product_category: { id: { $eq: strapiCategoryId } },
            },
          },
        });

        if (existing.data && existing.data.length > 0) {
          console.log(`   ⏭️  Skipping "${subcategory.name}" (already exists)`);
          continue;
        }

        await strapiClient.post('/product-subcategories', strapiData);
        successCount++;
        console.log(`   ✓ Migrated: ${subcategory.name}`);
      } catch (err) {
        errorCount++;
        logError(`Failed to migrate subcategory: ${subcategory.name}`, err);
      }
    }

    logSuccess(`Migrated ${successCount} product subcategories (${errorCount} errors)`);
  } catch (error) {
    logError('Failed to migrate product subcategories', error);
    throw error;
  }
}

async function migrateTreeCategories() {
  logStep('Migrating Tree Categories (Multi-tenant)');

  try {
    const { data: categories, error } = await supabase
      .from('tree_categories')
      .select('*')
      .order('category');

    if (error) throw error;

    if (!categories || categories.length === 0) {
      logWarning('No tree categories found in Supabase');
      return;
    }

    console.log(`   Found ${categories.length} tree categories to migrate`);

    let successCount = 0;
    let errorCount = 0;
    const categoryMapping: { [key: string]: string } = {};

    for (const category of categories) {
      try {
        const strapiData = {
          data: {
            name: category.category, // Map 'category' field to 'name'
            organization_id: category.organization_id,
          },
        };

        // Check if already exists
        const { data: existing } = await strapiClient.get('/tree-categories', {
          params: {
            filters: {
              name: { $eq: category.category },
              organization_id: { $eq: category.organization_id },
            },
          },
        });

        let strapiId: string;

        if (existing.data && existing.data.length > 0) {
          strapiId = existing.data[0].id;
          console.log(`   ⏭️  Skipping "${category.category}" (already exists)`);
        } else {
          const response = await strapiClient.post('/tree-categories', strapiData);
          strapiId = response.data.data.id;
          successCount++;
          console.log(`   ✓ Migrated: ${category.category}`);
        }

        categoryMapping[category.id] = strapiId;
      } catch (err) {
        errorCount++;
        logError(`Failed to migrate tree category: ${category.category}`, err);
      }
    }

    logSuccess(`Migrated ${successCount} tree categories (${errorCount} errors)`);

    // Now migrate trees
    await migrateTrees(categoryMapping);
  } catch (error) {
    logError('Failed to migrate tree categories', error);
    throw error;
  }
}

async function migrateTrees(categoryMapping: { [key: string]: string }) {
  logStep('Migrating Trees');

  try {
    const { data: trees, error } = await supabase
      .from('trees')
      .select('*')
      .order('name');

    if (error) throw error;

    if (!trees || trees.length === 0) {
      logWarning('No trees found in Supabase');
      return;
    }

    console.log(`   Found ${trees.length} trees to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const tree of trees) {
      try {
        const strapiCategoryId = categoryMapping[tree.category_id];

        if (!strapiCategoryId) {
          logWarning(`No mapping found for category_id: ${tree.category_id}`);
          continue;
        }

        const strapiData = {
          data: {
            name: tree.name,
            characteristics: null, // Field doesn't exist in current schema
            tree_category: strapiCategoryId,
          },
        };

        // Check if already exists
        const { data: existing } = await strapiClient.get('/trees', {
          params: {
            filters: {
              name: { $eq: tree.name },
              tree_category: { id: { $eq: strapiCategoryId } },
            },
          },
        });

        if (existing.data && existing.data.length > 0) {
          console.log(`   ⏭️  Skipping "${tree.name}" (already exists)`);
          continue;
        }

        await strapiClient.post('/trees', strapiData);
        successCount++;
        console.log(`   ✓ Migrated: ${tree.name}`);
      } catch (err) {
        errorCount++;
        logError(`Failed to migrate tree: ${tree.name}`, err);
      }
    }

    logSuccess(`Migrated ${successCount} trees (${errorCount} errors)`);
  } catch (error) {
    logError('Failed to migrate trees', error);
    throw error;
  }
}

async function migratePlantationTypes() {
  logStep('Migrating Plantation Types (Multi-tenant)');

  try {
    const { data: types, error } = await supabase
      .from('plantation_types')
      .select('*')
      .order('type');

    if (error) throw error;

    if (!types || types.length === 0) {
      logWarning('No plantation types found in Supabase');
      return;
    }

    console.log(`   Found ${types.length} plantation types to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const type of types) {
      try {
        const strapiData = {
          data: {
            name: type.type, // Map 'type' field to 'name'
            spacing: type.spacing,
            trees_per_ha: type.trees_per_ha,
            organization_id: type.organization_id,
            configuration: {
              spacing: type.spacing,
              trees_per_ha: type.trees_per_ha,
            },
          },
        };

        // Check if already exists
        const { data: existing } = await strapiClient.get('/plantation-types', {
          params: {
            filters: {
              name: { $eq: type.type },
              organization_id: { $eq: type.organization_id },
            },
          },
        });

        if (existing.data && existing.data.length > 0) {
          console.log(`   ⏭️  Skipping "${type.type}" (already exists)`);
          continue;
        }

        await strapiClient.post('/plantation-types', strapiData);
        successCount++;
        console.log(`   ✓ Migrated: ${type.type}`);
      } catch (err) {
        errorCount++;
        logError(`Failed to migrate plantation type: ${type.type}`, err);
      }
    }

    logSuccess(`Migrated ${successCount} plantation types (${errorCount} errors)`);
  } catch (error) {
    logError('Failed to migrate plantation types', error);
    throw error;
  }
}

// Main migration function
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  AgriTech Reference Data Migration: Supabase → Strapi');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Configuration:');
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Strapi URL: ${STRAPI_URL}`);
  console.log(`  Strapi Token: ${STRAPI_TOKEN ? '✓ Set' : '✗ Missing'}\n`);

  const startTime = Date.now();

  try {
    // Test Strapi connection
    logStep('Testing Strapi connection');
    await strapiClient.get('/test-types');
    logSuccess('Strapi connection successful');

    // Migrate in order (respecting dependencies)
    await migrateTestTypes();
    await migrateProductCategories();
    await migrateTreeCategories();
    await migratePlantationTypes();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`✅ Migration completed in ${duration}s`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Next steps:');
    console.log('  1. Verify data in Strapi admin: http://localhost:1337/admin');
    console.log('  2. Create AgriTech API proxy endpoints');
    console.log('  3. Update frontend hooks to use new API\n');
  } catch (error) {
    logError('Migration failed', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  main();
}

export { main as migrate };
