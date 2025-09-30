// Simple JavaScript version (no TypeScript)
import { Polar } from '@polar-sh/sdk';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

const POLAR_ACCESS_TOKEN = process.env.VITE_POLAR_ACCESS_TOKEN;
const POLAR_ORGANIZATION_ID = process.env.VITE_POLAR_ORGANIZATION_ID;

if (!POLAR_ACCESS_TOKEN || !POLAR_ORGANIZATION_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_POLAR_ACCESS_TOKEN');
  console.error('   - VITE_POLAR_ORGANIZATION_ID');
  console.error('\nPlease add them to your .env file');
  process.exit(1);
}

const polar = new Polar({
  accessToken: POLAR_ACCESS_TOKEN,
  server: process.env.VITE_POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production',
});

const products = [
  {
    name: 'Essential Plan',
    description:
      'Perfect for small commercial farms digitizing their operations. Includes core tools for farm management, employee tracking, and basic inventory management.',
    recurringInterval: 'month',
    prices: [
      {
        amountType: 'fixed',
        priceAmount: 2500, // $25.00 in cents
        priceCurrency: 'usd',
      },
    ],
    metadata: {
      plan_type: 'essential',
      max_farms: '2',
      max_parcels: '25',
      max_users: '5',
      has_analytics: 'false',
    },
  },
  {
    name: 'Professional Plan',
    description:
      'For data-driven farms leveraging analytics and precision agriculture. Includes everything in Essential plus satellite analysis, sensor integration, and AI-powered recommendations.',
    recurringInterval: 'month',
    prices: [
      {
        amountType: 'fixed',
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
    },
    isHighlighted: true,
  },
  {
    name: 'Agri-Business Plan',
    description:
      'For large enterprises with complex agricultural operations. Unlimited everything, full financial suite, predictive analytics, API access, and priority support.',
    recurringInterval: 'month',
    prices: [
      {
        amountType: 'custom',
        priceCurrency: 'usd',
      },
    ],
    metadata: {
      plan_type: 'enterprise',
      max_farms: 'unlimited',
      max_parcels: 'unlimited',
      max_users: 'unlimited',
      has_analytics: 'true',
      has_api_access: 'true',
      contact_sales: 'true',
    },
  },
];

async function createProducts() {
  console.log('🚀 Creating Polar.sh products...\n');
  console.log(`Organization ID: ${POLAR_ORGANIZATION_ID}\n`);

  const createdProducts = [];

  for (const product of products) {
    try {
      console.log(`📦 Creating: ${product.name}`);

      // Create the product with prices
      // Don't pass organizationId - it's implied by the token
      const response = await polar.products.create({
        name: product.name,
        description: product.description,
        recurringInterval: product.recurringInterval,
        prices: product.prices,
        metadata: product.metadata,
        isHighlighted: product.isHighlighted || false,
      });

      console.log(`   ✅ Product created with ID: ${response.id}`);

      // Display pricing info
      if (product.prices && product.prices.length > 0) {
        const price = product.prices[0];
        if (price.amountType === 'custom') {
          console.log(`   💼 Custom pricing - contact sales`);
        } else if (price.priceAmount) {
          console.log(
            `   💰 Price: $${(price.priceAmount / 100).toFixed(2)} ${
              price.priceCurrency.toUpperCase()
            }/${product.recurringInterval}`
          );
        }
      }

      createdProducts.push({
        name: product.name,
        id: response.id,
        plan_type: product.metadata.plan_type,
      });

      console.log('');
    } catch (error) {
      console.error(`❌ Failed to create ${product.name}:`);
      console.error(`   ${error.message}\n`);
    }
  }

  console.log('\n✨ Setup complete!\n');

  if (createdProducts.length > 0) {
    console.log('📋 Created Products Summary:\n');
    createdProducts.forEach((p) => {
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

createProducts().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
