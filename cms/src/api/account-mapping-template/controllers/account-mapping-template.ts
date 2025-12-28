import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::account-mapping-template.account-mapping-template', ({ strapi }) => ({
  async findByCountryCode(ctx) {
    const { countryCode } = ctx.params;

    const entity = await strapi.db.query('api::account-mapping-template.account-mapping-template').findOne({
      where: { country_code: countryCode.toUpperCase() },
    });

    if (!entity) {
      return ctx.notFound('Account mapping template not found for country code: ' + countryCode);
    }

    return this.transformResponse(entity);
  },
}));
