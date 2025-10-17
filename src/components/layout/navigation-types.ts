/**
 * @fileoverview Shared navigation type definitions used by dashboard layout
 * components and route loaders.
 */

import type { ComponentType, ReactNode } from 'react';

/**
 * Supported role identifiers for navigation targeting. These align with the
 * roles returned from Supabase and the auth middleware.
 */
export type NavigationRole = 'admin' | 'coach' | 'client' | 'all';

/**
 * Configuration for a single navigation link within the dashboard shell.
 */
export interface NavigationItem {
  /**
   * Unique identifier for tracking analytics and conditional rendering.
   */
  id: string;
  /**
   * Fully qualified href including locale prefix. Server loaders are
   * responsible for constructing locale aware paths.
   */
  href: string;
  /**
   * Already localized label to display in the UI.
   */
  label: string;
  /**
   * Optional description rendered as assistive text for screen readers.
   */
  description?: string;
  /**
   * Icon component rendered next to the label. Lucide icons satisfy this
   * contract.
   */
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /**
   * When set to `true` the link will render with an external link indicator and
   * open in a new tab.
   */
  external?: boolean;
  /**
   * Optional badge text used to indicate counts or statuses.
   */
  badge?: ReactNode;
  /**
   * Controls which dashboard roles should see the item. Omit to show for all
   * roles.
   */
  roles?: NavigationRole[];
  /**
   * Determines how active state is computed.
   * - `exact`: only highlight on exact pathname match
   * - `startsWith`: highlight when the pathname begins with the href
   */
  matchBehavior?: 'exact' | 'startsWith';
}

/**
 * Logical grouping of navigation items rendered with a section label.
 */
export interface NavigationSection {
  id: string;
  label?: string;
  items: NavigationItem[];
}

/**
 * Composite configuration consumed by the dashboard shell. Separates primary
 * navigation from secondary/supporting sections.
 */
export interface DashboardNavigationConfig {
  primary: NavigationSection[];
  secondary?: NavigationSection[];
  footer?: NavigationSection;
}
