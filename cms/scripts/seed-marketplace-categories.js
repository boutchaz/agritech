/**
 * Seed script to create marketplace categories for AgriTech platform
 *
 * Prerequisites:
 * 1. Strapi must be running
 * 2. Marketplace Category content type must be created
 * 3. API permissions must be configured in Strapi admin:
 *    - Settings > Users & Permissions plugin > Roles > Public
 *    - Enable: find, findOne for Marketplace-Category
 *
 * Usage:
 *   node cms/scripts/seed-marketplace-categories.js
 *
 * Environment Variables:
 *   STRAPI_API_URL - Strapi API URL (default: http://localhost:1337/api)
 *   STRAPI_API_TOKEN - Strapi API token for authentication
 */

const API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

if (!API_TOKEN) {
  console.error('❌ STRAPI_API_TOKEN environment variable is required');
  console.error('   Generate a token in Strapi Admin: Settings > API Tokens > Create new API Token');
  process.exit(1);
}

// Helper function to make API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };

  if (data) {
    options.body = JSON.stringify({ data });
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    console.error(`Error ${method} ${endpoint}:`, result);
    throw new Error(result.error?.message || 'API request failed');
  }

  return result;
}

// Marketplace Categories for AgriTech
const marketplaceCategories = [
  {
    name: 'Cultures & Récoltes',
    slug: 'crops',
    description: 'Fruits, légumes, céréales et produits frais de la ferme',
    icon: '🌾',
    sort_order: 1,
    is_featured: true,
  },
  {
    name: 'Machines & Équipements',
    slug: 'machinery',
    description: 'Tracteurs, moissonneuses, systèmes d\'irrigation et équipements agricoles',
    icon: '🚜',
    sort_order: 2,
    is_featured: true,
  },
  {
    name: 'Intrants & Fournitures',
    slug: 'inputs',
    description: 'Engrais, semences, pesticides et produits phytosanitaires',
    icon: '🧪',
    sort_order: 3,
    is_featured: true,
  },
  {
    name: 'Bétail & Aliments',
    slug: 'livestock',
    description: 'Animaux, aliments pour bétail et produits vétérinaires',
    icon: '🐄',
    sort_order: 4,
    is_featured: true,
  },
  {
    name: 'Services Agricoles',
    slug: 'services',
    description: 'Main d\'œuvre, conseil agricole, transport et logistique',
    icon: '👨‍🌾',
    sort_order: 5,
    is_featured: false,
  },
  {
    name: 'Fruits',
    slug: 'fruits',
    description: 'Oranges, pommes, poires, raisins et fruits de saison',
    icon: '🍊',
    sort_order: 6,
    is_featured: false,
  },
  {
    name: 'Légumes',
    slug: 'vegetables',
    description: 'Tomates, pommes de terre, oignons et légumes frais',
    icon: '🥬',
    sort_order: 7,
    is_featured: false,
  },
  {
    name: 'Céréales & Grains',
    slug: 'grains',
    description: 'Blé, orge, maïs, riz et autres céréales',
    icon: '🌽',
    sort_order: 8,
    is_featured: false,
  },
  {
    name: 'Huile d\'Olive',
    slug: 'olive-oil',
    description: 'Huile d\'olive vierge extra, huile d\'olive et produits oléicoles',
    icon: '🫒',
    sort_order: 9,
    is_featured: true,
  },
  {
    name: 'Dattes & Fruits Secs',
    slug: 'dates-dried-fruits',
    description: 'Dattes Medjool, amandes, noix et fruits séchés',
    icon: '🌴',
    sort_order: 10,
    is_featured: false,
  },
  {
    name: 'Arganier & Produits Dérivés',
    slug: 'argan',
    description: 'Huile d\'argan, cosmétiques et produits à base d\'argan',
    icon: '🌳',
    sort_order: 11,
    is_featured: false,
  },
  {
    name: 'Miel & Apiculture',
    slug: 'honey',
    description: 'Miel naturel, propolis, cire d\'abeille et équipements apicoles',
    icon: '🍯',
    sort_order: 12,
    is_featured: false,
  },
  {
    name: 'Plantes Aromatiques',
    slug: 'aromatic-plants',
    description: 'Safran, romarin, menthe et plantes médicinales',
    icon: '🌿',
    sort_order: 13,
    is_featured: false,
  },
  {
    name: 'Irrigation & Arrosage',
    slug: 'irrigation',
    description: 'Systèmes d\'irrigation goutte à goutte, pompes et accessoires',
    icon: '💧',
    sort_order: 14,
    is_featured: false,
  },
  {
    name: 'Serres & Tunnels',
    slug: 'greenhouses',
    description: 'Serres agricoles, tunnels et équipements de culture sous abri',
    icon: '🏠',
    sort_order: 15,
    is_featured: false,
  },
  {
    name: 'Emballage & Conditionnement',
    slug: 'packaging',
    description: 'Caisses, palettes, films et matériaux d\'emballage',
    icon: '📦',
    sort_order: 16,
    is_featured: false,
  },
  {
    name: 'Transport & Logistique',
    slug: 'transport',
    description: 'Services de transport, camions frigorifiques et logistique',
    icon: '🚛',
    sort_order: 17,
    is_featured: false,
  },
  {
    name: 'Bio & Organique',
    slug: 'organic',
    description: 'Produits certifiés bio, agriculture biologique',
    icon: '♻️',
    sort_order: 18,
    is_featured: false,
  },
];

// Main seeding function
async function seedMarketplaceCategories() {
  console.log('🌱 Starting marketplace categories seeding process...\n');
  console.log(`📡 API URL: ${API_URL}`);
  console.log(`🔑 Token: ${API_TOKEN.substring(0, 10)}...`);
  console.log('');

  try {
    // Check existing categories first
    console.log('🔍 Checking existing categories...');
    const existing = await apiRequest('/marketplace-categories');
    const existingSlugs = (existing.data || []).map(cat => cat.attributes?.slug || cat.slug);
    console.log(`   Found ${existingSlugs.length} existing categories\n`);

    // Create categories
    console.log('📁 Creating marketplace categories...');
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const category of marketplaceCategories) {
      // Skip if already exists
      if (existingSlugs.includes(category.slug)) {
        console.log(`⏭️  Skipped (exists): ${category.name}`);
        skipped++;
        continue;
      }

      try {
        const result = await apiRequest('/marketplace-categories', 'POST', category);
        const categoryId = result.data?.id;

        // Publish the category immediately
        if (categoryId) {
          await apiRequest(`/marketplace-categories/${categoryId}`, 'PUT', {
            ...category,
            publishedAt: new Date().toISOString()
          });
        }

        console.log(`✅ Created: ${category.icon} ${category.name}`);
        created++;
      } catch (error) {
        console.error(`❌ Failed to create ${category.name}:`, error.message);
        failed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${marketplaceCategories.length}`);

    if (created > 0) {
      console.log('\n🎉 Marketplace categories seeding completed successfully!');
      console.log('\n📌 Next steps:');
      console.log('   1. Go to Strapi Admin: http://localhost:1337/admin');
      console.log('   2. Navigate to Content Manager > Marketplace Categories');
      console.log('   3. Optionally add images to categories');
      console.log('   4. Deploy changes to production');
    }

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedMarketplaceCategories();
