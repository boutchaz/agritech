/**
 * crop-type controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::crop-type.crop-type', ({ strapi }) => ({
  async find(ctx) {
    // Add populate for related entities
    ctx.query = {
      ...ctx.query,
      populate: {
        crop_category: true,
        varieties: true,
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
