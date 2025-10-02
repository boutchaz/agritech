#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
const DIRECTUS_URL = process.env.DIRECTUS_URL;

if (!ADMIN_TOKEN || !DIRECTUS_URL) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function seedData() {
  console.log('🌱 Seeding initial catalog data...\n');

  try {
    // Load tree categories from JSON
    const treeTypesPath = path.join(__dirname, '../../project/src/data/tree-types.json');
    const treeTypes = JSON.parse(fs.readFileSync(treeTypesPath, 'utf-8'));

    console.log(`📦 Found ${treeTypes.length} tree categories\n`);

    // Create categories and trees
    for (const categoryData of treeTypes) {
      console.log(`Creating category: ${categoryData.category}`);

      // Create the category
      const categoryResponse = await fetch(`${DIRECTUS_URL}/items/tree_categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          category: categoryData.category,
          status: 'published'
        })
      });

      if (!categoryResponse.ok) {
        const error = await categoryResponse.json();
        console.warn(`  ⚠️  Category error:`, error.errors?.[0]?.message);
        continue;
      }

      const category = await categoryResponse.json();
      const categoryId = category.data.id;

      console.log(`  ✅ Created category (ID: ${categoryId})`);

      // Create trees for this category
      for (const treeName of categoryData.trees) {
        const treeResponse = await fetch(`${DIRECTUS_URL}/items/trees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          },
          body: JSON.stringify({
            name: treeName,
            category_id: categoryId,
            status: 'published'
          })
        });

        if (treeResponse.ok) {
          console.log(`    ✅ Added tree: ${treeName}`);
        } else {
          const error = await treeResponse.json();
          console.warn(`    ⚠️  Tree error for ${treeName}:`, error.errors?.[0]?.message);
        }
      }

      console.log('');
    }

    // Load plantation types
    const plantationTypesPath = path.join(__dirname, '../../project/src/data/plantation-types.json');
    const plantationTypes = JSON.parse(fs.readFileSync(plantationTypesPath, 'utf-8'));

    console.log(`\n🌾 Seeding ${plantationTypes.length} plantation types\n`);

    for (const plantationType of plantationTypes) {
      const response = await fetch(`${DIRECTUS_URL}/items/plantation_types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          type: plantationType.type,
          spacing: plantationType.spacing,
          trees_per_ha: plantationType.treesPerHa,
          status: 'published'
        })
      });

      if (response.ok) {
        console.log(`  ✅ ${plantationType.type} (${plantationType.spacing}) - ${plantationType.treesPerHa} trees/ha`);
      } else {
        const error = await response.json();
        console.warn(`  ⚠️  Error:`, error.errors?.[0]?.message);
      }
    }

    console.log('\n✨ Initial catalog data seeded successfully!');
    console.log('\n💡 Access Directus admin at:', DIRECTUS_URL);

  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

seedData();
