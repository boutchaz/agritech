import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1e293b' },
        { name: 'gray', value: '#f8fafc' },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story, context) => {
      // Apply dark class when dark background is selected
      const isDark = context.globals?.backgrounds?.value === '#1e293b';
      return Story();
    },
  ],
};

export default preview;
