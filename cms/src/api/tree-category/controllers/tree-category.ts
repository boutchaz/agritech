/**
 * tree-category controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::tree-category.tree-category', ({ strapi }) => ({
  // Optional: Add custom controller methods here
  async find(ctx) {
    // Add populate for related trees
    ctx.query = {
      ...ctx.query,
      populate: {
        trees: true,
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
