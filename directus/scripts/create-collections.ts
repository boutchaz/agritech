#!/usr/bin/env tsx

import { createAdminClient } from '../config';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('❌ DIRECTUS_ADMIN_TOKEN not found in environment variables');
  process.exit(1);
}

const directus = createAdminClient(ADMIN_TOKEN);

async function createCollection(schemaPath: string) {
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const collectionName = schema.collection;

    console.log(`📦 Creating collection: ${collectionName}`);

    // Create the collection using raw fetch
    const response = await fetch(`${process.env.DIRECTUS_URL}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        collection: schema.collection,
        meta: schema.meta,
        schema: schema.schema
      })
    });

    if (!response.ok && response.status !== 409) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to create collection');
    }

    if (response.status === 409) {
      console.log(`⚠️  Collection already exists, skipping...`);
      return false;
    }

    console.log(`✅ Collection ${collectionName} created`);

    // Create fields
    for (const field of schema.fields) {
      console.log(`  📝 Creating field: ${field.field}`);

      const fieldResponse = await fetch(`${process.env.DIRECTUS_URL}/fields/${collectionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify(field)
      });

      if (!fieldResponse.ok && fieldResponse.status !== 409) {
        const error = await fieldResponse.json();
        console.warn(`  ⚠️  Field ${field.field}:`, error.errors?.[0]?.message || 'Error');
      }
    }

    console.log(`✅ All fields created for ${collectionName}`);
    return true;
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log(`⚠️  Collection already exists, skipping...`);
      return false;
    }
    console.error(`❌ Error creating collection:`, error.message || error);
    throw error;
  }
}

async function createRelation(from: string, to: string, field: string, relatedField?: string) {
  try {
    console.log(`🔗 Creating relation: ${from}.${field} -> ${to}`);

    const response = await fetch(`${process.env.DIRECTUS_URL}/relations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        collection: from,
        field: field,
        related_collection: to,
        meta: {
          one_field: relatedField || null,
          sort_field: null,
          one_deselect_action: 'nullify'
        },
        schema: {
          on_delete: 'CASCADE'
        }
      })
    });

    if (!response.ok && response.status !== 409) {
      const error = await response.json();
      console.warn(`  ⚠️  Relation error:`, error.errors?.[0]?.message || 'Error');
      return;
    }

    if (response.status === 409) {
      console.log(`⚠️  Relation already exists, skipping...`);
      return;
    }

    console.log(`✅ Relation created`);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log(`⚠️  Relation already exists, skipping...`);
      return;
    }
    console.error(`❌ Error creating relation:`, error.message || error);
  }
}

async function main() {
  console.log('🚀 Starting Directus collection creation...\n');

  const schemasDir = path.join(__dirname, '../schemas');

  try {
    // Create collections in order (parent first)
    await createCollection(path.join(schemasDir, 'tree-categories.schema.json'));
    await createCollection(path.join(schemasDir, 'trees.schema.json'));
    await createCollection(path.join(schemasDir, 'plantation-types.schema.json'));

    // Create relations
    console.log('\n🔗 Creating relations...\n');
    await createRelation('trees', 'tree_categories', 'category_id', 'trees');

    // Add o2m alias field for trees after relation is created
    console.log('\n📝 Adding o2m field for trees...\n');
    try {
      const response = await fetch(`${process.env.DIRECTUS_URL}/fields/tree_categories`, {
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

      if (response.ok || response.status === 409) {
        console.log('✅ Trees o2m field added');
      } else {
        const error = await response.json();
        console.warn('⚠️  Trees field warning:', error.errors?.[0]?.message);
      }
    } catch (error: any) {
      console.warn('⚠️  Could not add trees field:', error.message);
    }

    console.log('\n✨ All collections and relations created successfully!');
  } catch (error) {
    console.error('\n❌ Failed to create collections:', error);
    process.exit(1);
  }
}

main();
