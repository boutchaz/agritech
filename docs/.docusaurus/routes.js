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
    component: ComponentCreator('/', '3cd'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '9dd'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '49e'),
            routes: [
              {
                path: '/api/hooks',
                component: ComponentCreator('/api/hooks', '732'),
                exact: true
              },
              {
                path: '/api/satellite-api',
                component: ComponentCreator('/api/satellite-api', '83a'),
                exact: true
              },
              {
                path: '/api/supabase-functions',
                component: ComponentCreator('/api/supabase-functions', 'ec5'),
                exact: true
              },
              {
                path: '/architecture/backend',
                component: ComponentCreator('/architecture/backend', '3b4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/database',
                component: ComponentCreator('/architecture/database', 'f31'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/frontend',
                component: ComponentCreator('/architecture/frontend', 'b82'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/multi-tenancy',
                component: ComponentCreator('/architecture/multi-tenancy', '277'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/nestjs-api',
                component: ComponentCreator('/architecture/nestjs-api', '491'),
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
                path: '/architecture/satellite-service',
                component: ComponentCreator('/architecture/satellite-service', '2a8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/contributing',
                component: ComponentCreator('/contributing', '159'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/database/functions',
                component: ComponentCreator('/database/functions', '36a'),
                exact: true
              },
              {
                path: '/database/migrations',
                component: ComponentCreator('/database/migrations', 'db6'),
                exact: true
              },
              {
                path: '/database/rls-policies',
                component: ComponentCreator('/database/rls-policies', '49d'),
                exact: true
              },
              {
                path: '/database/schema',
                component: ComponentCreator('/database/schema', '6c3'),
                exact: true
              },
              {
                path: '/database/triggers',
                component: ComponentCreator('/database/triggers', 'bc5'),
                exact: true
              },
              {
                path: '/database/type-generation',
                component: ComponentCreator('/database/type-generation', 'f63'),
                exact: true
              },
              {
                path: '/deployment/environment-variables',
                component: ComponentCreator('/deployment/environment-variables', '334'),
                exact: true
              },
              {
                path: '/deployment/monitoring',
                component: ComponentCreator('/deployment/monitoring', 'dcd'),
                exact: true
              },
              {
                path: '/deployment/production',
                component: ComponentCreator('/deployment/production', '7c6'),
                exact: true
              },
              {
                path: '/deployment/staging',
                component: ComponentCreator('/deployment/staging', '223'),
                exact: true
              },
              {
                path: '/development/coding-standards',
                component: ComponentCreator('/development/coding-standards', '2bb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/development/debugging',
                component: ComponentCreator('/development/debugging', '7e5'),
                exact: true
              },
              {
                path: '/development/git-workflow',
                component: ComponentCreator('/development/git-workflow', '2cd'),
                exact: true
              },
              {
                path: '/development/performance',
                component: ComponentCreator('/development/performance', '8ee'),
                exact: true
              },
              {
                path: '/development/testing-strategy',
                component: ComponentCreator('/development/testing-strategy', '6f5'),
                exact: true
              },
              {
                path: '/features/accounting',
                component: ComponentCreator('/features/accounting', 'acd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/agricultural-accounting',
                component: ComponentCreator('/features/agricultural-accounting', 'f15'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/billing-cycle',
                component: ComponentCreator('/features/billing-cycle', '54f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/enhanced-parcel-planting-systems',
                component: ComponentCreator('/features/enhanced-parcel-planting-systems', 'f65'),
                exact: true
              },
              {
                path: '/features/farm-management',
                component: ComponentCreator('/features/farm-management', '842'),
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
                path: '/features/production-intelligence-data-flow',
                component: ComponentCreator('/features/production-intelligence-data-flow', 'ab5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/profitability',
                component: ComponentCreator('/features/profitability', '930'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/quality-control',
                component: ComponentCreator('/features/quality-control', '2fc'),
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
                path: '/features/task-management',
                component: ComponentCreator('/features/task-management', 'db0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/weather',
                component: ComponentCreator('/features/weather', 'b22'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/workers',
                component: ComponentCreator('/features/workers', '8ce'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/authentication',
                component: ComponentCreator('/frontend/authentication', 'ac1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/authorization',
                component: ComponentCreator('/frontend/authorization', 'bfa'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/components',
                component: ComponentCreator('/frontend/components', '2ca'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/forms',
                component: ComponentCreator('/frontend/forms', 'dd4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/internationalization',
                component: ComponentCreator('/frontend/internationalization', '53f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/routing',
                component: ComponentCreator('/frontend/routing', '198'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/state-management',
                component: ComponentCreator('/frontend/state-management', '2f6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/styling',
                component: ComponentCreator('/frontend/styling', 'e70'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/frontend/tech-stack',
                component: ComponentCreator('/frontend/tech-stack', '9f3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/environment-setup',
                component: ComponentCreator('/getting-started/environment-setup', '596'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/first-deployment',
                component: ComponentCreator('/getting-started/first-deployment', 'c75'),
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
                path: '/guides/adding-new-route',
                component: ComponentCreator('/guides/adding-new-route', 'cc8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/creating-component',
                component: ComponentCreator('/guides/creating-component', 'dac'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/data-fetching',
                component: ComponentCreator('/guides/data-fetching', '5c1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/database-migration',
                component: ComponentCreator('/guides/database-migration', '23a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/deployment',
                component: ComponentCreator('/guides/deployment', 'f82'),
                exact: true
              },
              {
                path: '/guides/satellite-integration',
                component: ComponentCreator('/guides/satellite-integration', '363'),
                exact: true
              },
              {
                path: '/guides/testing',
                component: ComponentCreator('/guides/testing', '64d'),
                exact: true
              },
              {
                path: '/testing/tax-calculations',
                component: ComponentCreator('/testing/tax-calculations', '13c'),
                exact: true
              },
              {
                path: '/troubleshooting',
                component: ComponentCreator('/troubleshooting', 'ab5'),
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
