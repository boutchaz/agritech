#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
const DIRECTUS_URL = process.env.DIRECTUS_URL;

if (!ADMIN_TOKEN || !DIRECTUS_URL) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function fixTreesField() {
  console.log('🔧 Fixing trees field in tree_categories...\n');

  try {
    // Delete the incorrect field
    console.log('🗑️  Deleting incorrect trees field...');
    const deleteResponse = await fetch(`${DIRECTUS_URL}/fields/tree_categories/trees`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (deleteResponse.ok || deleteResponse.status === 404) {
      console.log('✅ Field deleted or already removed');
    } else {
      const error = await deleteResponse.json();
      console.warn('⚠️  Delete warning:', error.errors?.[0]?.message || 'Unknown error');
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create the correct alias field
    console.log('\n📝 Creating correct trees alias field...');
    const createResponse = await fetch(`${DIRECTUS_URL}/fields/tree_categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        field: 'trees',
        type: 'alias',
        meta: {
          interface: 'list-o2m',
          special: ['o2m'],
          options: {
            template: '{{name}}'
          }
        }
      })
    });

    if (createResponse.ok || createResponse.status === 409) {
      console.log('✅ Trees field created successfully');
    } else {
      const error = await createResponse.json();
      console.error('❌ Create error:', error.errors?.[0]?.message || 'Unknown error');
      throw new Error('Failed to create field');
    }

    // Now create/update the relation
    console.log('\n🔗 Updating relation...');
    const relationResponse = await fetch(`${DIRECTUS_URL}/relations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        collection: 'trees',
        field: 'category_id',
        related_collection: 'tree_categories',
        meta: {
          one_field: 'trees',
          sort_field: null,
          one_deselect_action: 'nullify'
        },
        schema: {
          on_delete: 'SET NULL'
        }
      })
    });

    if (relationResponse.ok || relationResponse.status === 409) {
      console.log('✅ Relation configured');
    } else {
      const error = await relationResponse.json();
      console.warn('⚠️  Relation warning:', error.errors?.[0]?.message || 'Unknown error');
    }

    console.log('\n✨ Trees field fixed successfully!');
    console.log('\n💡 You can now view tree_categories in Directus admin panel');

  } catch (error: any) {
    console.error('\n❌ Failed to fix field:', error.message);
    process.exit(1);
  }
}

fixTreesField();
