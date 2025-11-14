import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Mail, Download, Trash2, Check, Plus, ArrowRight } from 'lucide-react';

/**
 * # Button Component
 * 
 * The Button component is the primary interactive element in the Satya Method design system.
 * Built with accessibility-first principles, it supports RTL languages, loading states, and
 * follows WCAG 2.1 AA guidelines.
 * 
 * ## Design Tokens
 * All button variants use the design tokens defined in `src/styles/tokens.css`:
 * 
 * - **Primary (default)**: Uses `--brand-teal` (Teal 700) - Primary actions
 * - **Secondary**: Uses `--secondary` (Sand 200/700) - Secondary actions
 * - **Destructive**: Uses `--brand-terracotta` (Terracotta 700) - Destructive actions
 * - **Success**: Uses `--brand-moss` (Moss 500) - Affirmative actions
 * - **Outline**: Transparent bg with `--border` (Sand 200)
 * - **Ghost**: Minimal styling for tertiary actions
 * - **Link**: Text-only with `--brand-teal` (Teal 500)
 * 
 * ## Accessibility Features
 * 
 * - Minimum touch target: 44x44px (WCAG 2.5.5)
 * - RTL support for Hebrew and Arabic
 * - ARIA attributes: `aria-label`, `aria-busy`, `aria-disabled`
 * - Screen reader announcements for loading states
 * - Keyboard navigation support
 * - Focus-visible indicators
 * - Icon-only buttons must have `aria-label`
 * 
 * ## Spacing & Typography
 * 
 * Uses design token spacing scale:
 * - Default: `h-11 px-6 py-2.5` (min-h: 44px)
 * - Small: `h-9 px-4 py-2` (min-h: 36px)
 * - Large: `h-13 px-8 py-3` (min-h: 52px)
 * - Icon: `h-11 w-11` (44x44px square)
 * 
 * Border radius uses `--radius-xl` (12px) for soft, approachable feel.
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Primary UI component for user actions. Supports multiple variants, sizes, loading states, and full accessibility features.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'success', 'outline', 'ghost', 'link'],
      description: 'Visual style variant aligned with design tokens',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Size variant - all meet WCAG touch target requirements',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'Shows spinner and disables interaction',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    loadingText: {
      control: 'text',
      description: 'Screen reader announcement during loading',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Loading...' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    iconOnly: {
      control: 'boolean',
      description: 'Indicates icon-only button (requires aria-label)',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    'aria-label': {
      control: 'text',
      description: 'Accessible label (required for icon-only buttons)',
      table: {
        type: { summary: 'string' },
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// PRIMARY VARIANTS - Design Token Based
// ============================================================================

/**
 * Default (Primary) variant using --brand-teal design token.
 * Use for primary actions like "Save", "Submit", "Continue".
 */
export const Default: Story = {
  args: {
    children: 'Primary Action',
    variant: 'default',
  },
};

/**
 * Secondary variant using --secondary design token (Sand palette).
 * Use for secondary actions that support the primary action.
 */
export const Secondary: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'secondary',
  },
};

/**
 * Destructive variant using --brand-terracotta design token.
 * Use for destructive actions like "Delete", "Remove", "Cancel subscription".
 */
export const Destructive: Story = {
  args: {
    children: 'Delete Item',
    variant: 'destructive',
  },
};

/**
 * Success variant using --brand-moss design token.
 * Use for affirmative actions like "Approve", "Confirm", "Accept".
 */
export const Success: Story = {
  args: {
    children: 'Approve Request',
    variant: 'success',
  },
};

/**
 * Outline variant with transparent background and --border token.
 * Use for lower-emphasis actions or when multiple buttons are present.
 */
export const Outline: Story = {
  args: {
    children: 'Outline Action',
    variant: 'outline',
  },
};

/**
 * Ghost variant for minimal, subtle interactions.
 * Use for tertiary actions or in tight layouts like tables.
 */
export const Ghost: Story = {
  args: {
    children: 'Ghost Action',
    variant: 'ghost',
  },
};

/**
 * Link variant styled as text with --brand-teal color.
 * Use for in-line actions or navigation-style buttons.
 */
export const Link: Story = {
  args: {
    children: 'Link Action',
    variant: 'link',
  },
};

// ============================================================================
// SIZE VARIANTS - All meet WCAG touch target requirements
// ============================================================================

/**
 * Small button (min-h: 36px) - use in compact UIs.
 * Still meets mobile touch target recommendations.
 */
export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

/**
 * Default size (min-h: 44px) - meets WCAG 2.5.5 Level AAA.
 * Recommended for most use cases.
 */
export const DefaultSize: Story = {
  args: {
    children: 'Default Size',
    size: 'default',
  },
};

/**
 * Large button (min-h: 52px) - use for primary CTAs.
 * Extra emphasis for important actions.
 */
export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

// ============================================================================
// ICON BUTTONS - Accessibility focused
// ============================================================================

/**
 * Icon-only button with required aria-label for accessibility.
 * The icon provides visual cues while aria-label ensures screen reader support.
 */
export const IconOnly: Story = {
  args: {
    size: 'icon',
    iconOnly: true,
    'aria-label': 'Send email',
    children: <Mail className="h-4 w-4" />,
  },
};

/**
 * Icon button with destructive styling.
 */
export const IconDestructive: Story = {
  args: {
    size: 'icon',
    variant: 'destructive',
    iconOnly: true,
    'aria-label': 'Delete item',
    children: <Trash2 className="h-4 w-4" />,
  },
};

/**
 * Icon button with outline styling.
 */
export const IconOutline: Story = {
  args: {
    size: 'icon',
    variant: 'outline',
    iconOnly: true,
    'aria-label': 'Download file',
    children: <Download className="h-4 w-4" />,
  },
};

// ============================================================================
// BUTTONS WITH ICONS - Text + Icon combinations
// ============================================================================

/**
 * Button with leading icon (LTR) / trailing icon (RTL).
 * Layout automatically adjusts for RTL languages.
 */
export const WithLeadingIcon: Story = {
  args: {
    children: (
      <>
        <Plus className="h-4 w-4" />
        Add New Item
      </>
    ),
  },
};

/**
 * Button with trailing icon (LTR) / leading icon (RTL).
 */
export const WithTrailingIcon: Story = {
  args: {
    children: (
      <>
        Continue
        <ArrowRight className="h-4 w-4" />
      </>
    ),
  },
};

/**
 * Button with both leading and trailing icons.
 */
export const WithBothIcons: Story = {
  args: {
    children: (
      <>
        <Check className="h-4 w-4" />
        Confirmed
        <Check className="h-4 w-4" />
      </>
    ),
    variant: 'success',
  },
};

// ============================================================================
// STATES - Loading, Disabled, etc.
// ============================================================================

/**
 * Loading state with spinner and screen reader announcement.
 * Button is automatically disabled during loading.
 */
export const Loading: Story = {
  args: {
    children: 'Processing',
    loading: true,
    loadingText: 'Processing your request...',
  },
};

/**
 * Loading state with custom announcement for screen readers.
 */
export const LoadingWithCustomText: Story = {
  args: {
    children: 'Save Changes',
    loading: true,
    loadingText: 'Saving your changes, please wait...',
  },
};

/**
 * Disabled state - non-interactive with reduced opacity.
 */
export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

/**
 * Disabled destructive button.
 */
export const DisabledDestructive: Story = {
  args: {
    children: 'Delete Item',
    variant: 'destructive',
    disabled: true,
  },
};

// ============================================================================
// VARIANT SHOWCASE - All variants in different sizes
// ============================================================================

/**
 * Showcase of all button variants in default size.
 * Demonstrates design token consistency across variants.
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="success">Success</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

/**
 * All variants in small size.
 */
export const AllVariantsSmall: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <Button variant="default" size="sm">Default</Button>
      <Button variant="secondary" size="sm">Secondary</Button>
      <Button variant="destructive" size="sm">Destructive</Button>
      <Button variant="success" size="sm">Success</Button>
      <Button variant="outline" size="sm">Outline</Button>
      <Button variant="ghost" size="sm">Ghost</Button>
      <Button variant="link" size="sm">Link</Button>
    </div>
  ),
};

/**
 * All variants in large size.
 */
export const AllVariantsLarge: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Button variant="default" size="lg">Default</Button>
      <Button variant="secondary" size="lg">Secondary</Button>
      <Button variant="destructive" size="lg">Destructive</Button>
      <Button variant="success" size="lg">Success</Button>
      <Button variant="outline" size="lg">Outline</Button>
      <Button variant="ghost" size="lg">Ghost</Button>
      <Button variant="link" size="lg">Link</Button>
    </div>
  ),
};

/**
 * Icon buttons in all variants.
 */
export const AllIconVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <Button variant="default" size="icon" aria-label="Default icon">
        <Plus className="h-4 w-4" />
      </Button>
      <Button variant="secondary" size="icon" aria-label="Secondary icon">
        <Check className="h-4 w-4" />
      </Button>
      <Button variant="destructive" size="icon" aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button variant="success" size="icon" aria-label="Success icon">
        <Check className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" aria-label="Download">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Ghost icon">
        <Mail className="h-4 w-4" />
      </Button>
    </div>
  ),
};

// ============================================================================
// RTL SUPPORT - Right-to-left language support
// ============================================================================

/**
 * Buttons automatically adjust for RTL languages (Hebrew, Arabic).
 * Icon positions and flex direction reverse in RTL mode.
 * 
 * Use the "Locale" toolbar to switch between LTR and RTL.
 */
export const RTLSupport: Story = {
  render: () => (
    <div className="flex flex-col gap-4 items-start" dir="rtl">
      <Button>
        <Plus className="h-4 w-4" />
        הוסף פריט חדש
      </Button>
      <Button variant="secondary">
        המשך
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button variant="outline">
        <Mail className="h-4 w-4" />
        שלח הודעה
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Buttons support RTL languages with automatic layout reversal. Try switching to Hebrew locale in the toolbar.',
      },
    },
  },
};

// ============================================================================
// ACCESSIBILITY EXAMPLES
// ============================================================================

/**
 * Demonstrates proper aria-label usage for icon-only buttons.
 * Screen readers will announce the label instead of "button".
 */
export const AccessibilityIconButtons: Story = {
  render: () => (
    <div className="flex gap-3 items-center">
      <Button size="icon" aria-label="Send email to customer">
        <Mail className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="destructive" aria-label="Delete selected items">
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="outline" aria-label="Download report as PDF">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Icon-only buttons require descriptive aria-labels for screen reader users.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'button-name',
            enabled: true,
          },
        ],
      },
    },
  },
};

/**
 * Loading states with screen reader announcements.
 * The loadingText prop provides context to assistive technologies.
 */
export const AccessibilityLoadingStates: Story = {
  render: () => (
    <div className="flex gap-3 items-center">
      <Button loading loadingText="Saving your changes">
        Save
      </Button>
      <Button loading loadingText="Deleting item" variant="destructive">
        Delete
      </Button>
      <Button loading loadingText="Uploading file" variant="secondary">
        Upload
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading buttons announce their state to screen readers via aria-live regions.',
      },
    },
  },
};

// ============================================================================
// REAL-WORLD USAGE PATTERNS
// ============================================================================

/**
 * Common form button group pattern.
 * Primary action on the left (LTR) with secondary/cancel on the right.
 */
export const FormActions: Story = {
  render: () => (
    <div className="flex gap-3 justify-end">
      <Button variant="outline">Cancel</Button>
      <Button>Save Changes</Button>
    </div>
  ),
};

/**
 * Modal dialog actions pattern.
 * Destructive action with cancel option.
 */
export const DialogActions: Story = {
  render: () => (
    <div className="flex gap-3 justify-end">
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Delete Account</Button>
    </div>
  ),
};

/**
 * Call-to-action pattern.
 * Large primary button with supporting secondary action.
 */
export const CallToAction: Story = {
  render: () => (
    <div className="flex flex-col gap-3 items-center">
      <Button size="lg">
        Start Free Trial
        <ArrowRight className="h-5 w-5" />
      </Button>
      <Button variant="link" size="sm">
        Learn more about pricing
      </Button>
    </div>
  ),
};

/**
 * Action group with multiple priorities.
 * Shows hierarchy through variant selection.
 */
export const ActionHierarchy: Story = {
  render: () => (
    <div className="flex gap-3 items-center">
      <Button>Primary Action</Button>
      <Button variant="secondary">Secondary Action</Button>
      <Button variant="outline">Tertiary Action</Button>
      <Button variant="ghost">Subtle Action</Button>
    </div>
  ),
};
