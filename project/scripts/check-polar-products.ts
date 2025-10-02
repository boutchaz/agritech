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

async function checkProducts() {
  console.log('🔍 Checking Polar products...\n');
  console.log(`Organization ID: ${POLAR_ORGANIZATION_ID}`);
  console.log(`Server: ${POLAR_SERVER || 'production'}\n`);

  try {
    const response = await polar.products.list({
      organizationId: POLAR_ORGANIZATION_ID,
    });

    console.log(`Found ${response.result?.items?.length || 0} products:\n`);

    if (response.result?.items) {
      // Filter only active products
      const activeProducts = response.result.items.filter((p: any) => !p.isArchived);

      console.log(`Active products: ${activeProducts.length}\n`);

      for (const product of activeProducts) {
        console.log(`📦 ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Archived: ${product.isArchived ? 'Yes' : 'No'}`);
        console.log(`   Description: ${product.description || 'N/A'}`);
        console.log(`   Plan Type: ${product.metadata?.plan_type || 'N/A'}`);
        console.log(`   Modules: ${product.metadata?.available_modules || 'N/A'}`);
        console.log(`   Max Farms: ${product.metadata?.max_farms || 'N/A'}`);
        console.log(`   Max Parcels: ${product.metadata?.max_parcels || 'N/A'}`);
        console.log(`   Max Users: ${product.metadata?.max_users || 'N/A'}`);
        console.log(`   Prices: ${product.prices?.length || 0}`);
        if (product.prices && product.prices.length > 0) {
          product.prices.forEach((price: any) => {
            console.log(`     - ${price.type}: ${price.priceAmount ? `$${price.priceAmount / 100}` : 'custom'}`);
          });
        }
        console.log('');
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.body) {
      console.error('Body:', error.body);
    }
  }
}

checkProducts();
