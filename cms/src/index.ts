import type { Core } from '@strapi/strapi';

// Marketplace Categories seed data
const marketplaceCategories = [
  {
    name: 'Cultures & Récoltes',
    slug: 'crops',
    description: 'Fruits, légumes, céréales et produits frais de la ferme',
    icon: '🌾',
    sort_order: 1,
    is_featured: true,
    locale: 'fr',
  },
  {
    name: 'Machines & Équipements',
    slug: 'machinery',
    description: 'Tracteurs, moissonneuses, systèmes d\'irrigation et équipements agricoles',
    icon: '🚜',
    sort_order: 2,
    is_featured: true,
    locale: 'fr',
  },
  {
    name: 'Intrants & Fournitures',
    slug: 'inputs',
    description: 'Engrais, semences, pesticides et produits phytosanitaires',
    icon: '🧪',
    sort_order: 3,
    is_featured: true,
    locale: 'fr',
  },
  {
    name: 'Bétail & Aliments',
    slug: 'livestock',
    description: 'Animaux, aliments pour bétail et produits vétérinaires',
    icon: '🐄',
    sort_order: 4,
    is_featured: true,
    locale: 'fr',
  },
  {
    name: 'Services Agricoles',
    slug: 'services',
    description: 'Main d\'œuvre, conseil agricole, transport et logistique',
    icon: '👨‍🌾',
    sort_order: 5,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Fruits',
    slug: 'fruits',
    description: 'Oranges, pommes, poires, raisins et fruits de saison',
    icon: '🍊',
    sort_order: 6,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Légumes',
    slug: 'vegetables',
    description: 'Tomates, pommes de terre, oignons et légumes frais',
    icon: '🥬',
    sort_order: 7,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Céréales & Grains',
    slug: 'grains',
    description: 'Blé, orge, maïs, riz et autres céréales',
    icon: '🌽',
    sort_order: 8,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Huile d\'Olive',
    slug: 'olive-oil',
    description: 'Huile d\'olive vierge extra, huile d\'olive et produits oléicoles',
    icon: '🫒',
    sort_order: 9,
    is_featured: true,
    locale: 'fr',
  },
  {
    name: 'Dattes & Fruits Secs',
    slug: 'dates-dried-fruits',
    description: 'Dattes Medjool, amandes, noix et fruits séchés',
    icon: '🌴',
    sort_order: 10,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Arganier & Produits Dérivés',
    slug: 'argan',
    description: 'Huile d\'argan, cosmétiques et produits à base d\'argan',
    icon: '🌳',
    sort_order: 11,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Miel & Apiculture',
    slug: 'honey',
    description: 'Miel naturel, propolis, cire d\'abeille et équipements apicoles',
    icon: '🍯',
    sort_order: 12,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Plantes Aromatiques',
    slug: 'aromatic-plants',
    description: 'Safran, romarin, menthe et plantes médicinales',
    icon: '🌿',
    sort_order: 13,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Irrigation & Arrosage',
    slug: 'irrigation',
    description: 'Systèmes d\'irrigation goutte à goutte, pompes et accessoires',
    icon: '💧',
    sort_order: 14,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Serres & Tunnels',
    slug: 'greenhouses',
    description: 'Serres agricoles, tunnels et équipements de culture sous abri',
    icon: '🏠',
    sort_order: 15,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Emballage & Conditionnement',
    slug: 'packaging',
    description: 'Caisses, palettes, films et matériaux d\'emballage',
    icon: '📦',
    sort_order: 16,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Transport & Logistique',
    slug: 'transport',
    description: 'Services de transport, camions frigorifiques et logistique',
    icon: '🚛',
    sort_order: 17,
    is_featured: false,
    locale: 'fr',
  },
  {
    name: 'Bio & Organique',
    slug: 'organic',
    description: 'Produits certifiés bio, agriculture biologique',
    icon: '♻️',
    sort_order: 18,
    is_featured: false,
    locale: 'fr',
  },
];

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Seed marketplace categories if they don't exist
    try {
      const categoryService = strapi.service('api::marketplace-category.marketplace-category');

      if (!categoryService) {
        strapi.log.warn('Marketplace category service not found, skipping seeding');
        return;
      }

      // Fetch all existing categories (including drafts) to check by slug
      const existingCategories = await strapi.entityService.findMany('api::marketplace-category.marketplace-category', {
        filters: {},
        publicationState: 'preview', // Include both published and draft
      });

      // Build a set of existing slugs for fast lookup
      const existingSlugs = new Set(
        (existingCategories || [])
          .map((cat: any) => cat.slug)
          .filter((slug: string) => slug)
      );

      strapi.log.info(`Found ${existingSlugs.size} existing marketplace categories`);

      // Seed missing categories only
      let created = 0;
      let skipped = 0;

      for (const category of marketplaceCategories) {
        // Skip if category with this slug already exists
        if (existingSlugs.has(category.slug)) {
          skipped++;
          continue;
        }

        try {
          await strapi.entityService.create('api::marketplace-category.marketplace-category', {
            data: {
              ...category,
              publishedAt: new Date(),
            },
          });
          strapi.log.info(`  ✅ Created: ${category.icon} ${category.name}`);
          created++;
        } catch (error) {
          strapi.log.error(`  ❌ Failed to create ${category.name}:`, error.message);
        }
      }

      if (created > 0) {
        strapi.log.info(`🎉 Marketplace categories seeding completed: ${created} created, ${skipped} skipped`);
      } else if (skipped > 0) {
        strapi.log.info(`✅ Marketplace categories already seeded (${skipped} existing)`);
      }
    } catch (error) {
      strapi.log.error('Failed to seed marketplace categories:', error);
    }
  },
};
