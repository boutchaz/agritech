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
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/mobile-app',
        'architecture/desktop-app',
      ],
    },
    {
      type: 'category',
      label: 'Database',
      items: [
        'database/schema',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/satellite-analysis',
        'features/subscriptions',
        'features/ai-calibration',
        'features/ai-operational-engine',
        'features/real-time',
        'features/calibration-v2-validation-report',
      ],
    },
    {
      type: 'category',
      label: 'AI Specifications',
      items: [
        'specs/ai-workflow',
        'specs/annual-plan-generation',
        'specs/ai-feature-specs',
        'specs/reference-data-specs',
        'specs/calibration-input-forms',
        'specs/calibration-test-flow',
        'specs/calibration-engine-spec',
        'specs/operational-engine-spec',
      ],
    },
    {
      type: 'category',
      label: 'Crop Referentials',
      items: [
        'referentials/overview',
        'referentials/olive-tree',
        'referentials/avocado',
        'referentials/citrus',
        'referentials/date-palm',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/adding-feature',
        'guides/onboarding-redesign',
        'guides/module-implementation',
        'guides/mobile-responsive',
        'guides/development-setup',
        'guides/platform-overview',
        'guides/desktop-app-plan',
      ],
    },
  ],
};

export default sidebars;
