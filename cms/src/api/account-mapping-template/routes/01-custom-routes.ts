export default {
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
