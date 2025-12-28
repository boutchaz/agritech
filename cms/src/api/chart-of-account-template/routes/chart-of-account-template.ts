/**
 * chart-of-account-template router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::chart-of-account-template.chart-of-account-template');

const customRoutes = {
  routes: [
    {
      method: 'GET',
      path: '/chart-of-account-templates/countries',
      handler: 'chart-of-account-template.listCountries',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/chart-of-account-templates/country/:countryCode',
      handler: 'chart-of-account-template.findByCountryCode',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};

export default {
  routes: [...customRoutes.routes, ...defaultRouter.routes],
};
