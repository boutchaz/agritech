import type {Config} from '@docusaurus/types';
import {themes as prismThemes} from 'prism-react-renderer';

const config: Config = {
  title: 'AgriTech Platform Documentation',
  tagline: 'Comprehensive agricultural technology platform with multi-tenant architecture, satellite data analysis, and AI-powered insights',
  url: 'https://docs.agritech.example.com',
  baseUrl: '/', // Make sure your new logo is at `static/img/logo.svg`
  favicon: 'img/logo.svg',
  organizationName: 'agritech',
  projectName: 'agritech-platform',
  onBrokenLinks: 'throw',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  markdown: { 
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editCurrentVersion: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
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
      title: 'AgriTech Platform',
      logo: {
        alt: 'AgriTech Platform',
        src: 'img/logo.svg', // This path should point to your new logo
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/agritech/platform',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/' },
            { label: 'Architecture', to: '/architecture/overview' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/agritech/platform' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AgriTech Platform. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
