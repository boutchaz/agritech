import { Polar } from '@polar-sh/sdk';

// Load environment variables
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
});

const products = [
  {
    name: 'Essential Plan',
    description: 'Perfect for small commercial farms digitizing their operations. Includes core tools for farm management, employee tracking, and basic inventory management.',
    prices: [
      {
        amount: 2500, // $25.00 in cents
        currency: 'USD',
        recurring_interval: 'month' as const,
      },
    ],
    metadata: {
      plan_type: 'essential',
      max_farms: '2',
      max_parcels: '25',
      max_users: '5',
      has_analytics: 'false',
    },
    is_highlighted: false,
  },
  {
    name: 'Professional Plan',
    description: 'For data-driven farms leveraging analytics and precision agriculture. Includes everything in Essential plus satellite analysis, sensor integration, and AI-powered recommendations.',
    prices: [
      {
        amount: 7500, // $75.00 in cents
        currency: 'USD',
        recurring_interval: 'month' as const,
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
    is_highlighted: true,
  },
  {
    name: 'Agri-Business Plan',
    description: 'For large enterprises with complex agricultural operations. Unlimited everything, full financial suite, predictive analytics, API access, and priority support.',
    prices: [], // Contact sales - no fixed price
    metadata: {
      plan_type: 'enterprise',
      max_farms: 'unlimited',
      max_parcels: 'unlimited',
      max_users: 'unlimited',
      has_analytics: 'true',
      has_sensor_integration: 'true',
      has_ai_recommendations: 'true',
      has_api_access: 'true',
      has_priority_support: 'true',
      contact_sales: 'true',
    },
    is_highlighted: false,
  },
];

async function createProducts() {
  console.log('🚀 Creating Polar.sh products...\n');
  console.log(`Organization ID: ${POLAR_ORGANIZATION_ID}\n`);

  const createdProducts = [];

  for (const product of products) {
    try {
      console.log(`📦 Creating: ${product.name}`);

      const response = await polar.products.create({
        organizationId: POLAR_ORGANIZATION_ID,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        isHighlighted: product.is_highlighted,
      });

      console.log(`   ✅ Product created with ID: ${response.id}`);

      // If product has prices, create them
      if (product.prices.length > 0) {
        for (const priceData of product.prices) {
          try {
            const price = await polar.products.createPrice({
              productId: response.id,
              amountType: 'fixed',
              priceAmount: priceData.amount,
              priceCurrency: priceData.currency,
              recurringInterval: priceData.recurring_interval,
            });

            console.log(
              `   💰 Price created: $${(priceData.amount / 100).toFixed(2)} ${
                priceData.currency
              }/${priceData.recurring_interval}`
            );
          } catch (error: any) {
            console.error(`   ❌ Failed to create price: ${error.message}`);
          }
        }
      } else {
        console.log(`   💼 Contact sales - no fixed pricing`);
      }

      createdProducts.push({
        name: product.name,
        id: response.id,
        plan_type: product.metadata.plan_type,
      });

      console.log('');
    } catch (error: any) {
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
