#!/usr/bin/env ts-node

/**
 * Strapi Reference Data Seed Script
 *
 * Seeds Strapi CMS with default reference data
 *
 * Usage:
 *   npm run seed:strapi
 *
 * Environment variables required:
 *   STRAPI_API_URL
 *   STRAPI_API_TOKEN
 */

import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Configuration
const STRAPI_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_TOKEN) {
  console.error('❌ Missing STRAPI_API_TOKEN environment variable');
  console.log('💡 Create an API token in Strapi admin: Settings → API Tokens');
  process.exit(1);
}

// Initialize Strapi client
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

// Load seed data
const seedDataPath = path.join(__dirname, 'seed-reference-data.json');
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

// Seed functions

async function seedTestTypes() {
  logStep('Seeding Test Types (Global)');

  try {
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const testType of seedData.test_types) {
      try {
        // Check if already exists
        const { data: existing } = await strapiClient.get('/test-types', {
          params: {
            'filters[name][$eq]': testType.name,
          },
        });

        if (existing.data && existing.data.length > 0) {
          logWarning(`Test type already exists: ${testType.name}`);
          skipCount++;
          continue;
        }

        // Create new test type
        await strapiClient.post('/test-types', {
          data: {
            name: testType.name,
            description: testType.description,
            parameters: testType.parameters,
          },
        });

        successCount++;
        console.log(`   ✓ Created: ${testType.name}`);
      } catch (error: any) {
        errorCount++;
        console.error(`   ✗ Failed to create ${testType.name}:`, error.response?.data || error.message);
      }
    }

    logSuccess(`Test Types: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);
  } catch (error) {
    logError('Failed to seed test types', error);
    throw error;
  }
}

async function seedProductCategories() {
  logStep('Seeding Product Categories (Global)');

  try {
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const categoryMap = new Map<string, number>();

    for (const category of seedData.product_categories) {
      try {
        // Check if already exists
        const { data: existing } = await strapiClient.get('/product-categories', {
          params: {
            'filters[name][$eq]': category.name,
          },
        });

        if (existing.data && existing.data.length > 0) {
          logWarning(`Product category already exists: ${category.name}`);
          categoryMap.set(category.name, existing.data[0].id);
          skipCount++;
          continue;
        }

        // Create new category
        const response = await strapiClient.post('/product-categories', {
          data: {
            name: category.name,
            description: category.description,
          },
        });

        categoryMap.set(category.name, response.data.data.id);
        successCount++;
        console.log(`   ✓ Created: ${category.name}`);
      } catch (error: any) {
        errorCount++;
        console.error(`   ✗ Failed to create ${category.name}:`, error.response?.data || error.message);
      }
    }

    logSuccess(`Product Categories: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);

    // Seed subcategories
    await seedProductSubcategories(categoryMap);
  } catch (error) {
    logError('Failed to seed product categories', error);
    throw error;
  }
}

async function seedProductSubcategories(categoryMap: Map<string, number>) {
  logStep('Seeding Product Subcategories');

  try {
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const [categoryName, subcategories] of Object.entries(seedData.product_subcategories)) {
      const categoryId = categoryMap.get(categoryName);

      if (!categoryId) {
        logWarning(`Category not found for subcategories: ${categoryName}`);
        continue;
      }

      for (const subcategory of subcategories as any[]) {
        try {
          // Check if already exists
          const { data: existing } = await strapiClient.get('/product-subcategories', {
            params: {
              'filters[name][$eq]': subcategory.name,
              'filters[product_category][id][$eq]': categoryId,
            },
          });

          if (existing.data && existing.data.length > 0) {
            skipCount++;
            continue;
          }

          // Create new subcategory
          await strapiClient.post('/product-subcategories', {
            data: {
              name: subcategory.name,
              description: subcategory.description,
              product_category: categoryId,
            },
          });

          successCount++;
          console.log(`   ✓ Created: ${categoryName} → ${subcategory.name}`);
        } catch (error: any) {
          errorCount++;
          console.error(`   ✗ Failed to create ${subcategory.name}:`, error.response?.data || error.message);
        }
      }
    }

    logSuccess(`Product Subcategories: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);
  } catch (error) {
    logError('Failed to seed product subcategories', error);
    throw error;
  }
}

async function seedTreeCategoriesAndTrees() {
  logStep('Seeding Tree Categories and Trees (Note: Organization-specific, seeding as templates)');

  try {
    let categoryCount = 0;
    let treeCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Note: These will be seeded without organization_id as templates
    // In production, they should be created per organization

    for (const categoryData of seedData.tree_categories_with_trees) {
      try {
        // Check if category already exists
        const { data: existingCategory } = await strapiClient.get('/tree-categories', {
          params: {
            'filters[name][$eq]': categoryData.category,
          },
        });

        let categoryId: number;

        if (existingCategory.data && existingCategory.data.length > 0) {
          categoryId = existingCategory.data[0].id;
          skipCount++;
        } else {
          // Create category
          const categoryResponse = await strapiClient.post('/tree-categories', {
            data: {
              name: categoryData.category,
              // Note: organization_id should be added when creating via organization context
            },
          });

          categoryId = categoryResponse.data.data.id;
          categoryCount++;
          console.log(`   ✓ Created category: ${categoryData.category}`);
        }

        // Create trees for this category
        for (const treeName of categoryData.trees) {
          try {
            // Check if tree already exists
            const { data: existingTree } = await strapiClient.get('/trees', {
              params: {
                'filters[name][$eq]': treeName,
                'filters[tree_category][id][$eq]': categoryId,
              },
            });

            if (existingTree.data && existingTree.data.length > 0) {
              skipCount++;
              continue;
            }

            // Create tree
            await strapiClient.post('/trees', {
              data: {
                name: treeName,
                tree_category: categoryId,
              },
            });

            treeCount++;
            console.log(`      ✓ Created tree: ${treeName}`);
          } catch (error: any) {
            errorCount++;
            console.error(`      ✗ Failed to create tree ${treeName}:`, error.response?.data || error.message);
          }
        }
      } catch (error: any) {
        errorCount++;
        console.error(`   ✗ Failed to create category ${categoryData.category}:`, error.response?.data || error.message);
      }
    }

    logSuccess(`Tree Categories: ${categoryCount} created, Trees: ${treeCount} created, ${skipCount} skipped, ${errorCount} errors`);
    logWarning('Note: Tree categories and trees are templates. They should be created per organization in production.');
  } catch (error) {
    logError('Failed to seed tree categories and trees', error);
    throw error;
  }
}

async function seedPlantationTypes() {
  logStep('Seeding Plantation Types (Note: Organization-specific, seeding as templates)');

  try {
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const plantationType of seedData.plantation_types) {
      try {
        // Check if already exists
        const { data: existing } = await strapiClient.get('/plantation-types', {
          params: {
            'filters[type][$eq]': plantationType.type,
          },
        });

        if (existing.data && existing.data.length > 0) {
          skipCount++;
          continue;
        }

        // Create new plantation type
        await strapiClient.post('/plantation-types', {
          data: {
            type: plantationType.type,
            spacing: plantationType.spacing,
            trees_per_ha: plantationType.trees_per_ha,
            // Note: organization_id should be added when creating via organization context
          },
        });

        successCount++;
        console.log(`   ✓ Created: ${plantationType.type} (${plantationType.spacing}, ${plantationType.trees_per_ha} trees/ha)`);
      } catch (error: any) {
        errorCount++;
        console.error(`   ✗ Failed to create ${plantationType.type}:`, error.response?.data || error.message);
      }
    }

    logSuccess(`Plantation Types: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);
    logWarning('Note: Plantation types are templates. They should be created per organization in production.');
  } catch (error) {
    logError('Failed to seed plantation types', error);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  AgriTech Strapi CMS - Reference Data Seeding');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Configuration:');
  console.log(`  Strapi URL: ${STRAPI_URL}`);
  console.log(`  Strapi Token: ✓ Set`);
  console.log('');

  const startTime = Date.now();

  try {
    // Test Strapi connection
    logStep('Testing Strapi connection');
    try {
      await strapiClient.get('/product-categories?pagination[limit]=1');
      logSuccess('Strapi connection successful');
    } catch (error: any) {
      if (error.response?.status === 404) {
        logError('Strapi collection types not found. Make sure Strapi is built and running.');
        throw new Error('Strapi collections not accessible');
      }
      throw error;
    }

    // Seed data in order
    await seedTestTypes();
    await seedProductCategories();
    await seedTreeCategoriesAndTrees();
    await seedPlantationTypes();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    logSuccess(`Seeding completed in ${duration} seconds`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Verify data in Strapi admin: https://cms.thebzlab.online/admin');
    console.log('  2. Test API endpoints via AgriTech API');
    console.log('  3. Create organization-specific tree categories and plantation types');
    console.log('');
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    logError(`Seeding failed after ${duration} seconds`);
    console.log('═══════════════════════════════════════════════════════');
    console.error(error);
    process.exit(1);
  }
}

main();
