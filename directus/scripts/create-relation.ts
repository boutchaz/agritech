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

async function createRelation() {
  console.log('🔗 Creating proper relation between trees and tree_categories...\n');

  try {
    // Create the relation
    const response = await fetch(`${DIRECTUS_URL}/relations`, {
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
          one_collection: 'tree_categories',
          one_allowed_collections: null,
          junction_field: null,
          sort_field: null,
          one_deselect_action: 'nullify'
        }
      })
    });

    if (!response.ok && response.status !== 409) {
      const error = await response.json();
      console.error('❌ Error:', error);
      throw new Error(error.errors?.[0]?.message || 'Failed to create relation');
    }

    if (response.status === 409) {
      console.log('⚠️  Relation already exists, updating metadata...');

      // Try to update the relation metadata
      const updateResponse = await fetch(`${DIRECTUS_URL}/relations/trees/category_id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          meta: {
            one_field: 'trees',
            one_collection: 'tree_categories',
            one_allowed_collections: null,
            junction_field: null,
            sort_field: null,
            one_deselect_action: 'nullify'
          }
        })
      });

      if (updateResponse.ok) {
        console.log('✅ Relation metadata updated');
      } else {
        const error = await updateResponse.json();
        console.warn('⚠️  Update warning:', error.errors?.[0]?.message);
      }
    } else {
      console.log('✅ Relation created successfully');
    }

    console.log('\n✨ Done! Try refreshing your Directus admin panel.');

  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

createRelation();
