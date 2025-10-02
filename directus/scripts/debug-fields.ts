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

async function debugFields() {
  console.log('🔍 Checking tree_categories fields...\n');

  try {
    // Get all fields for tree_categories
    const response = await fetch(`${DIRECTUS_URL}/fields/tree_categories`, {
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

    const fields = await response.json();

    console.log('📋 Fields in tree_categories:\n');
    fields.data.forEach((field: any) => {
      console.log(`Field: ${field.field}`);
      console.log(`  Type: ${field.type}`);
      console.log(`  Schema:`, field.schema);
      console.log(`  Meta special:`, field.meta?.special);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

debugFields();
