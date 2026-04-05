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

function getErrorDetails(error: unknown): { message: string; body?: unknown } {
  if (error instanceof Error) {
    const errorWithBody = error as Error & { body?: unknown };
    return {
      message: error.message,
      body: errorWithBody.body,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as Record<string, unknown>;
    return {
      message: typeof errorRecord.message === 'string' ? errorRecord.message : 'Unknown error',
      body: errorRecord.body,
    };
  }

  return { message: 'Unknown error' };
}

// The IDs of the products we want to keep active
const PRODUCTS_TO_KEEP = [
  'd53c78fb-5833-43da-a4f0-2a0bd2ff32c9', // Agri-Business Plan
  'db925c1e-d64d-4d95-9907-dc90da5bcbe6', // Professional Plan
  '3b03769f-9a47-47bc-8f07-bd1f3a580dee', // Essential Plan
];

async function restoreProducts() {
  console.log('🔄 Restoring main products...\n');
  console.log(`Organization ID: ${POLAR_ORGANIZATION_ID}\n`);

  try {
    const response = await polar.products.list({
      organizationId: POLAR_ORGANIZATION_ID,
    });

    const products = response.result?.items || [];
    console.log(`Found ${products.length} total products\n`);

    for (const product of products) {
      if (PRODUCTS_TO_KEEP.includes(product.id)) {
        try {
          await polar.products.update({
            id: product.id,
            productUpdate: {
              isArchived: false,
            },
          });
          console.log(`✅ Restored: ${product.name} (${product.metadata?.plan_type})`);
        } catch (error: unknown) {
          const { message } = getErrorDetails(error);
          console.error(`❌ Failed to restore ${product.name}: ${message}`);
        }
      }
    }

    console.log('\n✨ Restore complete!');
    console.log('\nYou should now see 3 active products in your dashboard:');
    console.log('  • Essential Plan ($25/month)');
    console.log('  • Professional Plan ($75/month)');
    console.log('  • Agri-Business Plan (Custom pricing)');
  } catch (error: unknown) {
    const { message, body } = getErrorDetails(error);
    console.error('❌ Error:', message);
    if (body) {
      console.error('Body:', body);
    }
  }
}

restoreProducts();
