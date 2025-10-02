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

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate Polar products...\n');
  console.log(`Organization ID: ${POLAR_ORGANIZATION_ID}\n`);

  try {
    const response = await polar.products.list({
      organizationId: POLAR_ORGANIZATION_ID,
    });

    const products = response.result?.items || [];
    console.log(`Found ${products.length} total products\n`);

    // Group products by plan_type
    const grouped = new Map<string, any[]>();
    for (const product of products) {
      const planType = product.metadata?.plan_type || 'unknown';
      if (!grouped.has(planType)) {
        grouped.set(planType, []);
      }
      grouped.get(planType)!.push(product);
    }

    // Keep the first of each type, archive the rest
    for (const [planType, items] of grouped.entries()) {
      console.log(`\n📋 Plan type: ${planType} (${items.length} instances)`);

      if (items.length > 1) {
        const toKeep = items[0];
        const toArchive = items.slice(1);

        console.log(`   ✅ Keeping: ${toKeep.name} (${toKeep.id})`);

        for (const product of toArchive) {
          try {
            await polar.products.update({
              id: product.id,
              productUpdate: {
                isArchived: true,
              },
            });
            console.log(`   🗑️  Archived: ${product.name} (${product.id})`);
          } catch (error: any) {
            console.error(`   ❌ Failed to archive ${product.id}: ${error.message}`);
          }
        }
      } else {
        console.log(`   ✅ Only one instance found: ${items[0].name} (${items[0].id})`);
      }
    }

    console.log('\n✨ Cleanup complete!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.body) {
      console.error('Body:', error.body);
    }
  }
}

cleanupDuplicates();
