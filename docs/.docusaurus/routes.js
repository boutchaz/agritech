import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '822'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', 'a57'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '66e'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', 'b54'),
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
                path: '/features/accounting',
                component: ComponentCreator('/features/accounting', 'acd'),
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
                path: '/features/ai-chat',
                component: ComponentCreator('/features/ai-chat', '7be'),
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
                path: '/features/auth-permissions',
                component: ComponentCreator('/features/auth-permissions', '52a'),
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
                path: '/features/compliance',
                component: ComponentCreator('/features/compliance', '6d7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/cron-jobs',
                component: ComponentCreator('/features/cron-jobs', '91d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/inventory',
                component: ComponentCreator('/features/inventory', 'a01'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/marketplace',
                component: ComponentCreator('/features/marketplace', '629'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/notifications',
                component: ComponentCreator('/features/notifications', '6bb'),
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
                path: '/features/tasks-workforce',
                component: ComponentCreator('/features/tasks-workforce', '600'),
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
                path: '/guides/desktop-app-plan',
                component: ComponentCreator('/guides/desktop-app-plan', '631'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/development-setup',
                component: ComponentCreator('/guides/development-setup', 'b63'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/mobile-responsive',
                component: ComponentCreator('/guides/mobile-responsive', '3f5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/module-implementation',
                component: ComponentCreator('/guides/module-implementation', '87d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/onboarding-redesign',
                component: ComponentCreator('/guides/onboarding-redesign', '7db'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/platform-overview',
                component: ComponentCreator('/guides/platform-overview', '822'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/store-publishing',
                component: ComponentCreator('/guides/store-publishing', '30c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/referentials/avocado',
                component: ComponentCreator('/referentials/avocado', 'e26'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/referentials/citrus',
                component: ComponentCreator('/referentials/citrus', '1b3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/referentials/date-palm',
                component: ComponentCreator('/referentials/date-palm', 'ace'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/referentials/olive-tree',
                component: ComponentCreator('/referentials/olive-tree', '341'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/referentials/overview',
                component: ComponentCreator('/referentials/overview', '692'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/specs/ai-feature-specs',
                component: ComponentCreator('/specs/ai-feature-specs', 'dc8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/specs/ai-workflow',
                component: ComponentCreator('/specs/ai-workflow', 'e55'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/specs/annual-plan-generation',
                component: ComponentCreator('/specs/annual-plan-generation', '36b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/specs/calibration-engine-spec',
                component: ComponentCreator('/specs/calibration-engine-spec', '93b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/specs/calibration-input-forms',
                component: ComponentCreator('/specs/calibration-input-forms', 'dc2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/specs/calibration-test-flow',
                component: ComponentCreator('/specs/calibration-test-flow', '560'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/specs/operational-engine-spec',
                component: ComponentCreator('/specs/operational-engine-spec', 'd45'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/specs/reference-data-specs',
                component: ComponentCreator('/specs/reference-data-specs', 'cf5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', '7da'),
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
