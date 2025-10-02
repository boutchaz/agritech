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
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_POLAR_ACCESS_TOKEN');
  console.error('   - VITE_POLAR_ORGANIZATION_ID');
  console.error('\nPlease add them to your .env file');
  process.exit(1);
}

const polar = new Polar({
  accessToken: POLAR_ACCESS_TOKEN,
  server: POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production',
});

const products = [
  {
    name: 'Essential Plan',
    description: 'Perfect for small commercial farms digitizing their operations. Includes 3 agriculture modules (Fruit Trees, Cereals, Vegetables), core tools for farm management, employee tracking, and basic inventory management.',
    recurringInterval: 'month' as const,
    prices: [
      {
        amountType: 'fixed' as const,
        priceAmount: 2500, // $25.00 in cents
        priceCurrency: 'usd',
      },
    ],
    metadata: {
      plan_type: 'essential',
      max_farms: '2',
      max_parcels: '25',
      max_users: '5',
      max_satellite_reports: '0',
      has_analytics: 'false',
      has_sensor_integration: 'false',
      has_ai_recommendations: 'false',
      has_advanced_reporting: 'false',
      has_api_access: 'false',
      has_priority_support: 'false',
      available_modules: 'fruit-trees,cereals,vegetables',
    },
  },
  {
    name: 'Professional Plan',
    description: 'For data-driven farms leveraging analytics and precision agriculture. Includes 5 modules (Essential + Mushrooms, Livestock), satellite analysis, sensor integration, and AI-powered recommendations.',
    recurringInterval: 'month' as const,
    prices: [
      {
        amountType: 'fixed' as const,
        priceAmount: 7500, // $75.00 in cents
        priceCurrency: 'usd',
      },
    ],
    metadata: {
      plan_type: 'professional',
      max_farms: '10',
      max_parcels: '200',
      max_users: '25',
      max_satellite_reports: '10',
      has_analytics: 'true',
      has_sensor_integration: 'true',
      has_ai_recommendations: 'true',
      has_advanced_reporting: 'true',
      has_api_access: 'false',
      has_priority_support: 'false',
      available_modules: 'fruit-trees,cereals,vegetables,mushrooms,livestock',
    },
  },
  {
    name: 'Agri-Business Plan',
    description: 'For large enterprises with complex agricultural operations. All modules unlocked, unlimited everything, full financial suite, predictive analytics, API access, and priority support.',
    recurringInterval: 'month' as const,
    prices: [
      {
        amountType: 'custom' as const,
      },
    ],
    metadata: {
      plan_type: 'enterprise',
      max_farms: 'unlimited',
      max_parcels: 'unlimited',
      max_users: 'unlimited',
      max_satellite_reports: 'unlimited',
      has_analytics: 'true',
      has_sensor_integration: 'true',
      has_ai_recommendations: 'true',
      has_advanced_reporting: 'true',
      has_api_access: 'true',
      has_priority_support: 'true',
      available_modules: '*',
      contact_sales: 'true',
    },
  },
];

async function createOrUpdateProducts() {
  console.log('🚀 Setting up Polar.sh products...\n');
  console.log(`Organization ID: ${POLAR_ORGANIZATION_ID}\n`);

  // First, fetch existing products
  console.log('📋 Fetching existing products...\n');
  let existingProducts: any[] = [];
  try {
    const response = await polar.products.list({
      organizationId: POLAR_ORGANIZATION_ID,
    });
    existingProducts = response.result?.items || [];
    console.log(`   Found ${existingProducts.length} existing product(s)\n`);
  } catch (error: any) {
    console.error(`⚠️  Failed to fetch existing products: ${error.message}\n`);
  }

  const processedProducts = [];

  for (const product of products) {
    try {
      // Check if product already exists by name or plan_type metadata
      const existing = existingProducts.find(
        (p) =>
          p.name === product.name ||
          p.metadata?.plan_type === product.metadata.plan_type
      );

      let productResponse;

      if (existing) {
        console.log(`🔄 Updating existing product: ${product.name} (${existing.id})`);

        productResponse = await polar.products.update({
          id: existing.id,
          productUpdate: {
            name: product.name,
            description: product.description,
            metadata: product.metadata,
            prices: product.prices,
          },
        });

        console.log(`   ✅ Product updated`);
      } else {
        console.log(`📦 Creating new product: ${product.name}`);

        productResponse = await polar.products.create({
          organizationId: POLAR_ORGANIZATION_ID,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: product.prices,
          recurringInterval: product.recurringInterval,
        });

        console.log(`   ✅ Product created with ID: ${productResponse.id}`);
      }

      // Show pricing info
      if (product.prices.length > 0) {
        product.prices.forEach((price: any) => {
          if (price.amountType === 'custom') {
            console.log(`   💼 Custom pricing - Contact sales`);
          } else if (price.priceAmount) {
            console.log(
              `   💰 Price: $${(price.priceAmount / 100).toFixed(2)} ${price.priceCurrency}/${product.recurringInterval}`
            );
          }
        });
      }

      processedProducts.push({
        name: product.name,
        id: productResponse.id,
        plan_type: product.metadata.plan_type,
      });

      console.log('');
    } catch (error: any) {
      console.error(`❌ Failed to process ${product.name}:`);
      console.error(`   ${error.message}\n`);
    }
  }

  console.log('\n✨ Setup complete!\n');

  if (processedProducts.length > 0) {
    console.log('📋 Processed Products Summary:\n');
    processedProducts.forEach((p) => {
      console.log(`   • ${p.name} (${p.plan_type})`);
      console.log(`     ID: ${p.id}\n`);
    });

    console.log('\n📝 Next Steps:\n');
    console.log('1. Go to Polar.sh dashboard to verify products');
    console.log('2. Configure webhook endpoint (see WEBHOOK_SETUP.md)');
    console.log('3. Test subscription flow in your app');
    console.log('4. Visit: http://localhost:5173/settings/subscription\n');
  }
}

createOrUpdateProducts().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
