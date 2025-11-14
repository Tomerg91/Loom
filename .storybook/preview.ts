import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';
import '../src/styles/tokens.css';
import '../src/styles/accessibility.css';

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
        {
          name: 'light',
          value: '#fdfcfb',
        },
        {
          name: 'dark',
          value: 'hsl(215, 30%, 8%)',
        },
        {
          name: 'sand',
          value: '#e7e5e4',
        },
      ],
    },
    layout: 'centered',
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English (LTR)' },
          { value: 'he', title: 'Hebrew (RTL)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme;
      const locale = context.globals.locale;
      const dir = locale === 'he' ? 'rtl' : 'ltr';

      // Apply theme class to document
      if (typeof document !== 'undefined') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', locale);
      }

      return (
        <div dir={dir} className={theme === 'dark' ? 'dark' : ''}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
