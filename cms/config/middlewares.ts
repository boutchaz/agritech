export default ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: env('CORS_ORIGINS', 'http://localhost:3001,https://agritech-api.thebzlab.online').split(','),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '10mb',    // Form body size limit
      jsonLimit: '10mb',    // JSON body size limit
      textLimit: '10mb',    // Text body size limit
      formidable: {
        maxFileSize: 50 * 1024 * 1024, // 50MB file upload limit
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
