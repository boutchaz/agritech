/**
 * crop-category controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::crop-category.crop-category', ({ strapi }) => ({
  async find(ctx) {
    // Add populate for related crop types
    ctx.query = {
      ...ctx.query,
      populate: {
        crop_types: true,
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
