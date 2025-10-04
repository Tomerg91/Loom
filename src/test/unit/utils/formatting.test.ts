import { describe, it, expect } from 'vitest';

import {
  formatDuration,
  truncateText,
  createUserProcessor,
  getInitials,
} from '@/lib/utils';

describe('formatDuration', () => {
  it('formats durations under an hour using minutes', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats durations with hours and minutes for english locales', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(125)).toBe('2h 5m');
  });

  it('formats durations for hebrew locale with localized units', () => {
    expect(formatDuration(90, 'he')).toBe('1 שעות ו-30 דקות');
    expect(formatDuration(50, 'he')).toBe('50 דקות');
  });
});

describe('truncateText', () => {
  it('returns the original text when below the limit', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('truncates and appends ellipsis when above the limit', () => {
    expect(truncateText('Hello World', 5)).toBe('Hello...');
  });
});

describe('createUserProcessor', () => {
  const processor = createUserProcessor();

  it('derives initials from first and last name', () => {
    expect(processor.getInitials({ firstName: 'Loom', lastName: 'User' })).toBe(
      'LU'
    );
  });

  it('falls back to name field when available', () => {
    expect(processor.getInitials({ name: 'Future Coach' })).toBe('FC');
    expect(processor.getDisplayName({ name: 'Future Coach' })).toBe(
      'Future Coach'
    );
  });

  it('uses email for initials and default display name when minimal data provided', () => {
    expect(processor.getInitials({ email: 'person@example.com' })).toBe('P');
    expect(processor.getDisplayName({ email: 'person@example.com' })).toBe(
      'person@example.com'
    );
  });

  it('returns placeholder display name when no user information exists', () => {
    expect(processor.getDisplayName({})).toBe('Unknown User');
    expect(processor.getInitials({})).toBe('?');
  });
});

describe('getInitials legacy helper', () => {
  it('delegates to createUserProcessor for backwards compatibility', () => {
    expect(getInitials('Test', 'User')).toBe('TU');
    expect(getInitials(undefined, undefined)).toBe('?');
  });
});
