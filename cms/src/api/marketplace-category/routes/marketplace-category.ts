/**
 * marketplace-category router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::marketplace-category.marketplace-category', {
  config: {
    find: {
      auth: false, // Public access for listing categories
    },
    findOne: {
      auth: false, // Public access for single category
    },
  },
});
