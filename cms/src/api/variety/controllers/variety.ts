/**
 * variety controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::variety.variety', ({ strapi }) => ({
  async find(ctx) {
    // Add populate for related crop type
    ctx.query = {
      ...ctx.query,
      populate: {
        crop_type: true,
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
