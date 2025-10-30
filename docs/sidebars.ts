import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/environment-setup',
        'getting-started/first-deployment',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/multi-tenancy',
        'architecture/frontend',
        'architecture/backend',
        'architecture/database',
        'architecture/satellite-service',
      ],
    },
    {
      type: 'category',
      label: 'Frontend',
      items: [
        'frontend/tech-stack',
        'frontend/routing',
        'frontend/state-management',
        'frontend/forms',
        'frontend/authentication',
        'frontend/authorization',
        'frontend/components',
        'frontend/styling',
        'frontend/internationalization',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/farm-management',
        'features/satellite-analysis',
        'features/task-management',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/adding-new-route',
        'guides/creating-component',
        'guides/database-migration',
        'guides/adding-feature',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/coding-standards',
      ],
    },
    {
      type: 'doc',
      id: 'troubleshooting',
      label: 'Troubleshooting',
    },
    {
      type: 'doc',
      id: 'contributing',
      label: 'Contributing',
    },
  ],
};

export default sidebars;