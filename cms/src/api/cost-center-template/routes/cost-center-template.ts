import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::cost-center-template.cost-center-template');

const customRoutes = {
  routes: [
    {
      method: 'GET',
      path: '/cost-center-templates/country/:countryCode',
      handler: 'cost-center-template.findByCountryCode',
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
