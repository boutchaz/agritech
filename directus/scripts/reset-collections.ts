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

async function resetCollections() {
  console.log('🗑️  Resetting collections...\n');

  const collections = ['trees', 'tree_categories', 'plantation_types'];

  try {
    // Delete collections in reverse order
    for (const collection of collections) {
      console.log(`Deleting ${collection}...`);
      const response = await fetch(`${DIRECTUS_URL}/collections/${collection}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });

      if (response.ok || response.status === 404) {
        console.log(`✅ ${collection} deleted`);
      } else {
        console.log(`⚠️  ${collection} not found or already deleted`);
      }
    }

    console.log('\n✨ Collections reset. Now run: yarn create-collections');

  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

resetCollections();
