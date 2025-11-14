# Storybook Configuration

This directory contains Storybook configuration for the Loom application's design system documentation.

## Setup Status

✅ **Configured Components:**
- Button component with comprehensive stories
- All variants documented (default, secondary, destructive, success, outline, ghost, link)
- Accessibility features documented
- Design token integration documented

✅ **Configuration Files:**
- `main.ts` - Main Storybook configuration
- `preview.ts` - Global decorators, parameters, and theme switching
- MDX documentation for components

## Known Issues

### Next.js 15 + Storybook 8 Webpack Compatibility

There is currently a webpack compatibility issue between:
- Next.js 15.5.4 (bundled webpack)
- Storybook 8.6.14 (webpack 5 builder)

**Error:** `Cannot read properties of undefined (reading 'tap')`

**Workarounds:**

1. **Upgrade to Storybook 9+** (when stable):
   ```bash
   npm install --save-dev storybook@^9.0.0 @storybook/nextjs@^9.0.0 @storybook/react@^9.0.0
   ```

2. **Use Vite builder** (alternative):
   ```bash
   npm install --save-dev @storybook/builder-vite
   ```
   Update `main.ts`:
   ```ts
   core: {
     builder: '@storybook/builder-vite'
   }
   ```

3. **Wait for Storybook 8.x patch** that fully supports Next.js 15.5+

## Running Storybook

Once the webpack compatibility issue is resolved:

```bash
# Development mode
npm run storybook

# Build static version
npm run build-storybook
```

## Features

### Theme Switching
Toggle between light and dark modes using the toolbar theme selector.

### RTL Support
Switch between LTR (English) and RTL (Hebrew) layouts using the locale toolbar.

### Accessibility Testing
The `@storybook/addon-a11y` addon provides real-time accessibility checks.

## Documentation Coverage

### Button Component
- ✅ All 7 variants documented
- ✅ All 4 size variants
- ✅ Loading states
- ✅ Icon button patterns
- ✅ RTL examples
- ✅ Accessibility examples
- ✅ Real-world usage patterns
- ✅ Design token mapping
- ✅ Comprehensive MDX documentation

## Design Token Integration

All stories demonstrate the proper use of design tokens from `src/styles/tokens.css`:

- **Colors:** Primary, secondary, destructive, success tokens
- **Spacing:** Consistent spacing scale
- **Typography:** Font size and weight tokens
- **Borders:** Radius and width tokens
- **Shadows:** Elevation scale
- **Animation:** Transition timing and easing

## Adding New Stories

1. Create a `.stories.tsx` file next to your component:
   ```tsx
   import type { Meta, StoryObj } from '@storybook/react';
   import { YourComponent } from './your-component';

   const meta: Meta<typeof YourComponent> = {
     title: 'Components/YourComponent',
     component: YourComponent,
   };

   export default meta;
   type Story = StoryObj<typeof meta>;

   export const Default: Story = {
     args: {
       // your props
     },
   };
   ```

2. Optionally create an `.mdx` file for detailed documentation

3. Stories are automatically discovered by Storybook

## References

- [Storybook for Next.js](https://storybook.js.org/docs/get-started/frameworks/nextjs)
- [Storybook Docs](https://storybook.js.org/docs)
- [Design Tokens](../src/styles/tokens.css)
- [Accessibility Guidelines](../src/styles/accessibility.css)
