export default {
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
