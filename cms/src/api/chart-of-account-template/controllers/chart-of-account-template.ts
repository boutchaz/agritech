/**
 * chart-of-account-template controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::chart-of-account-template.chart-of-account-template', ({ strapi }) => ({
  async find(ctx) {
    // Include related templates by default
    ctx.query = {
      ...ctx.query,
      populate: {
        account_mapping_template: true,
        cost_center_template: true,
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  async findOne(ctx) {
    // Include related templates by default
    ctx.query = {
      ...ctx.query,
      populate: {
        account_mapping_template: true,
        cost_center_template: true,
      },
    };

    const response = await super.findOne(ctx);
    return response;
  },

  // Custom action to find by country code
  async findByCountryCode(ctx) {
    const { countryCode } = ctx.params;

    const entity = await strapi.db.query('api::chart-of-account-template.chart-of-account-template').findOne({
      where: { country_code: countryCode.toUpperCase() },
      populate: {
        account_mapping_template: true,
        cost_center_template: true,
      },
    });

    if (!entity) {
      return ctx.notFound('Template not found for country code: ' + countryCode);
    }

    return this.transformResponse(entity);
  },

  // Custom action to list available countries
  async listCountries(ctx) {
    const entities = await strapi.db.query('api::chart-of-account-template.chart-of-account-template').findMany({
      select: ['country_code', 'country_name', 'country_name_native', 'accounting_standard', 'default_currency', 'version'],
      where: { publishedAt: { $notNull: true } },
    });

    return { data: entities };
  },
}));
