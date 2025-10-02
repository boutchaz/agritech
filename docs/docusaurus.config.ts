import type {Config} from '@docusaurus/types';
import {themes as prismThemes} from 'prism-react-renderer';

const config: Config = {
  title: 'Agritech Docs',
  tagline: 'Frontend, backend, database, and ops docs',
  url: 'https://docs.example.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'agritech',
  projectName: 'docs',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  markdown: { mermaid: true },
  themes: ['@docusaurus/theme-mermaid', 'redocusaurus'],
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.ts'),
          routeBasePath: '/',
          editCurrentVersion: false,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: '/',
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Agritech',
      items: [
        { to: '/', label: 'Docs', position: 'left' },
        { to: '/api', label: 'API', position: 'left' },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    redocusaurus: {
      specs: [
        {
          id: 'api',
          spec: 'openapi/openapi.json',
          route: '/api/',
        },
      ],
      theme: {
        primaryColor: '#0ea5e9',
      },
    },
  },
};

export default config;
