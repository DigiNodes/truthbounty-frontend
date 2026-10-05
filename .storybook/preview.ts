import { createElement } from 'react';
import type { Preview } from '@storybook/nextjs-vite';

import '../src/app/globals.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Gate C colour scheme',
      defaultValue: 'light',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
      return createElement(
        'div',
        { className: theme, 'data-theme': theme, style: { minHeight: '100vh' } },
        createElement(
          'div',
          { className: 'bg-canvas text-ink min-h-screen p-6' },
          createElement(Story),
        ),
      );
    },
  ],
  parameters: {
    layout: 'padded',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
    viewport: {
      options: {
        mobile: {
          name: 'Mobile · 390 × 844',
          styles: { width: '390px', height: '844px' },
        },
        tablet: {
          name: 'Tablet · 768 × 1024',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop · 1440 × 900',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
  },
};

export default preview;
