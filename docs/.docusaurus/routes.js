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
    component: ComponentCreator('/', '71d'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '4bd'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '3ef'),
            routes: [
              {
                path: '/architecture/desktop-app',
                component: ComponentCreator('/architecture/desktop-app', 'df2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/mobile-app',
                component: ComponentCreator('/architecture/mobile-app', 'a73'),
                exact: true,
                sidebar: "docs"
              },
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
                path: '/features/ai-calibration',
                component: ComponentCreator('/features/ai-calibration', 'c90'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/ai-operational-engine',
                component: ComponentCreator('/features/ai-operational-engine', '8ec'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/calibration-v2-validation-report',
                component: ComponentCreator('/features/calibration-v2-validation-report', '616'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/real-time',
                component: ComponentCreator('/features/real-time', '7dc'),
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
