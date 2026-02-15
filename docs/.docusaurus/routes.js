import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/search',
    component: ComponentCreator('/search', '822'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', 'bfd'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', 'bf1'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '14b'),
            routes: [
              {
                path: '/architecture/overview',
                component: ComponentCreator('/architecture/overview', 'f3c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/database/schema',
                component: ComponentCreator('/database/schema', '86d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/satellite-analysis',
                component: ComponentCreator('/features/satellite-analysis', '1b8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/subscriptions',
                component: ComponentCreator('/features/subscriptions', '9e9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/installation',
                component: ComponentCreator('/getting-started/installation', 'e0c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/quick-start',
                component: ComponentCreator('/getting-started/quick-start', '5eb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/adding-feature',
                component: ComponentCreator('/guides/adding-feature', '816'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/intro',
                component: ComponentCreator('/intro', '32d'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
