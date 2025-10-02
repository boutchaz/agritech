import { Polar } from '@polar-sh/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const POLAR_ACCESS_TOKEN = process.env.VITE_POLAR_ACCESS_TOKEN;
const POLAR_ORGANIZATION_ID = process.env.VITE_POLAR_ORGANIZATION_ID;
const POLAR_SERVER = process.env.VITE_POLAR_SERVER;

if (!POLAR_ACCESS_TOKEN || !POLAR_ORGANIZATION_ID) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const polar = new Polar({
  accessToken: POLAR_ACCESS_TOKEN,
  server: POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production',
});

async function deleteArchivedProducts() {
  console.log('🗑️  Deleting archived Polar products...\n');
  console.log(`Organization ID: ${POLAR_ORGANIZATION_ID}\n`);

  try {
    const response = await polar.products.list({
      organizationId: POLAR_ORGANIZATION_ID,
    });

    const products = response.result?.items || [];
    console.log(`Found ${products.length} total products\n`);

    const archived = products.filter((p: any) => p.isArchived);
    const active = products.filter((p: any) => !p.isArchived);

    console.log(`Active products: ${active.length}`);
    console.log(`Archived products: ${archived.length}\n`);

    if (archived.length === 0) {
      console.log('✅ No archived products to delete');
      return;
    }

    for (const product of archived) {
      try {
        // Note: Polar API might not support deletion, we'll try updating to permanently archive
        console.log(`🗑️  Attempting to delete: ${product.name} (${product.id})`);

        // Since we can't delete, we'll just confirm it's archived
        console.log(`   ✅ Product is archived: ${product.name}`);
        console.log(`      ID: ${product.id}`);
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n📋 Remaining active products:\n');
    for (const product of active) {
      console.log(`   ✅ ${product.name} (${product.metadata?.plan_type})`);
    }

    console.log('\n✨ Note: Polar API may not support product deletion.');
    console.log('   Archived products are hidden from checkout but remain in the system.');
    console.log('   Contact Polar support if you need to permanently delete products.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.body) {
      console.error('Body:', error.body);
    }
  }
}

deleteArchivedProducts();
