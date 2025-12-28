import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::account-mapping-template.account-mapping-template');

const customRoutes = {
  routes: [
    {
      method: 'GET',
      path: '/account-mapping-templates/country/:countryCode',
      handler: 'account-mapping-template.findByCountryCode',
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
