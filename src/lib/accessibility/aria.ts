// ARIA (Accessible Rich Internet Applications) utilities
export const ARIA_LABELS = {
  // Navigation
  mainNav: 'Main navigation',
  userMenu: 'User account menu',
  breadcrumb: 'Page breadcrumb',
  pagination: 'Pagination navigation',
  
  // Forms
  required: 'Required field',
  optional: 'Optional field',
  invalid: 'Invalid input',
  passwordShow: 'Show password',
  passwordHide: 'Hide password',
  
  // Sessions
  sessionList: 'Sessions list',
  sessionCard: 'Session details',
  bookSession: 'Book new session',
  cancelSession: 'Cancel session',
  rescheduleSession: 'Reschedule session',
  
  // Notifications
  notifications: 'Notifications',
  unreadNotifications: 'Unread notifications',
  markAsRead: 'Mark as read',
  dismissNotification: 'Dismiss notification',
  
  // General actions
  search: 'Search',
  filter: 'Filter options',
  sort: 'Sort options',
  close: 'Close dialog',
  confirm: 'Confirm action',
  cancel: 'Cancel action',
  
  // Status
  loading: 'Loading content',
  error: 'Error message',
  success: 'Success message',
  warning: 'Warning message',
  
  // Live regions
  statusUpdates: 'Status updates',
  announcements: 'Announcements',
} as const;

export const ARIA_DESCRIPTIONS = {
  // Password requirements
  passwordRequirements: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  
  // Session booking
  sessionDuration: 'Session duration in minutes',
  availableTimeSlots: 'Available time slots for booking',
  
  // Notifications
  notificationBadge: 'Number of unread notifications',
  
  // Form validation
  fieldError: 'This field has an error',
  requiredField: 'This field is required',
  
  // Navigation
  currentPage: 'Current page',
  externalLink: 'Opens in new window',
} as const;

// ARIA live region types
export const LIVE_REGIONS = {
  polite: 'polite',
  assertive: 'assertive',
  off: 'off',
} as const;

// Role definitions
export const ROLES = {
  // Landmark roles
  banner: 'banner',
  main: 'main',
  navigation: 'navigation',
  complementary: 'complementary',
  contentinfo: 'contentinfo',
  form: 'form',
  search: 'search',
  
  // Widget roles
  button: 'button',
  link: 'link',
  menuitem: 'menuitem',
  tab: 'tab',
  tabpanel: 'tabpanel',
  dialog: 'dialog',
  alertdialog: 'alertdialog',
  tooltip: 'tooltip',
  status: 'status',
  alert: 'alert',
  progressbar: 'progressbar',
  
  // Structure roles
  list: 'list',
  listitem: 'listitem',
  table: 'table',
  row: 'row',
  cell: 'cell',
  columnheader: 'columnheader',
  rowheader: 'rowheader',
} as const;

// ARIA states and properties
export interface AriaProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-disabled'?: boolean;
  'aria-pressed'?: boolean;
  'aria-checked'?: boolean;
  'aria-selected'?: boolean;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-activedescendant'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-readonly'?: boolean;
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-haspopup'?: 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-setsize'?: number;
  'aria-posinset'?: number;
  role?: string;
}

// Focus management utilities
export class FocusManager {
  private static focusableElements = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableElements)) as HTMLElement[];
  }

  static getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const elements = this.getFocusableElements(container);
    return elements[0] || null;
  }

  static getLastFocusableElement(container: HTMLElement): HTMLElement | null {
    const elements = this.getFocusableElements(container);
    return elements[elements.length - 1] || null;
  }

  static trapFocus(container: HTMLElement, event: KeyboardEvent) {
    if (event.key !== 'Tab') return;

    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  static restoreFocus(previouslyFocusedElement: HTMLElement | null) {
    if (previouslyFocusedElement && document.contains(previouslyFocusedElement)) {
      previouslyFocusedElement.focus();
    }
  }
}

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private static announcer: HTMLElement | null = null;

  static init() {
    if (this.announcer) return;

    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    document.body.appendChild(this.announcer);
  }

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.announcer) this.init();
    if (!this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
  }
}

// Keyboard navigation utilities
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

export function handleKeyboardNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect?: (index: number) => void
): number {
  let newIndex = currentIndex;

  switch (event.key) {
    case KEYBOARD_KEYS.ARROW_UP:
      event.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      break;
    case KEYBOARD_KEYS.ARROW_DOWN:
      event.preventDefault();
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      break;
    case KEYBOARD_KEYS.HOME:
      event.preventDefault();
      newIndex = 0;
      break;
    case KEYBOARD_KEYS.END:
      event.preventDefault();
      newIndex = items.length - 1;
      break;
    case KEYBOARD_KEYS.ENTER:
    case KEYBOARD_KEYS.SPACE:
      event.preventDefault();
      onSelect?.(currentIndex);
      return currentIndex;
    default:
      return currentIndex;
  }

  items[newIndex]?.focus();
  return newIndex;
}

// Color contrast utilities
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const getRGB = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * getRGB(r) + 0.7152 * getRGB(g) + 0.0722 * getRGB(b);
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWCAGStandard(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  } else {
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  }
}

// Touch and pointer utilities for mobile accessibility
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getMinimumTouchTarget(): { width: number; height: number } {
  // WCAG recommends minimum 44x44 CSS pixels
  return { width: 44, height: 44 };
}

// Reduced motion utilities
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// High contrast mode detection
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// Create ARIA live region utility
export function createAriaLiveRegion(
  priority: 'polite' | 'assertive' = 'polite',
  atomic: boolean = true
): HTMLElement {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', atomic.toString());
  liveRegion.className = 'sr-only';
  liveRegion.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  
  if (document.body) {
    document.body.appendChild(liveRegion);
  }
  
  return liveRegion;
}

// Announce to screen reader utility (wrapper for ScreenReaderAnnouncer.announce)
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  ScreenReaderAnnouncer.announce(message, priority);
}