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

async function checkRelations() {
  console.log('🔍 Checking relations...\n');

  try {
    const response = await fetch(`${DIRECTUS_URL}/relations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', error);
      return;
    }

    const relations = await response.json();

    console.log('📋 Relations involving tree_categories:\n');
    relations.data
      .filter((rel: any) =>
        rel.collection === 'tree_categories' ||
        rel.related_collection === 'tree_categories' ||
        rel.collection === 'trees'
      )
      .forEach((rel: any) => {
        console.log(`Collection: ${rel.collection}`);
        console.log(`  Field: ${rel.field}`);
        console.log(`  Related: ${rel.related_collection}`);
        console.log(`  Meta:`, rel.meta);
        console.log('');
      });

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

checkRelations();
