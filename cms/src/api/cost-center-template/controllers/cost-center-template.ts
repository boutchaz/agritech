import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::cost-center-template.cost-center-template', ({ strapi }) => ({
  async findByCountryCode(ctx) {
    const { countryCode } = ctx.params;

    const entity = await strapi.db.query('api::cost-center-template.cost-center-template').findOne({
      where: { country_code: countryCode.toUpperCase() },
    });

    if (!entity) {
      return ctx.notFound('Cost center template not found for country code: ' + countryCode);
    }

    return this.transformResponse(entity);
  },
}));
