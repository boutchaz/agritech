export default {
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
