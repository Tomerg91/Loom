# Accessibility Implementation Guide - Loom Therapy Platform

This document outlines the accessibility implementation for the Loom therapy platform, ensuring WCAG 2.1 AA compliance and comprehensive accessibility support.

## Overview

The Loom therapy platform is designed to be accessible to all users, including those with disabilities. This includes support for:
- Screen readers (NVDA, JAWS, VoiceOver)
- Keyboard navigation
- High contrast modes
- Reduced motion preferences
- Multiple languages (English, Hebrew) with RTL support

## Accessibility Features Implemented

### 1. Skip Navigation Links (CRITICAL)
**Location**: `src/app/[locale]/layout.tsx`
- Skip to main content
- Skip to navigation
- Bilingual support (English/Hebrew)
- Proper focus management

```tsx
<a href="#main-content" className="skip-link sr-only-focusable">
  {locale === 'he' ? 'עבור לתוכן הראשי' : 'Skip to main content'}
</a>
```

### 2. ARIA Enhancement
**Location**: `src/components/navigation/nav-menu.tsx`
- `aria-current="page"` for active navigation items
- `aria-label` for user role badge
- `aria-hidden="true"` for decorative icons
- Proper navigation landmarks

### 3. Form Accessibility
**Location**: `src/components/sessions/session-booking-form.tsx`
- `fieldset` and `legend` for form grouping
- `aria-describedby` for error associations
- `role="alert"` for error messages
- Proper time slot button accessibility

### 4. Password Toggle Enhancement
**Locations**: 
- `src/components/auth/signin-form.tsx`
- `src/components/auth/signup-form.tsx`
- `aria-pressed` state for toggle buttons
- `aria-label` for button descriptions
- `aria-hidden="true"` for decorative icons

### 5. Avatar Alt Text
**Locations**: Multiple components
- Descriptive alt text with full names
- Role context where appropriate
- Consistent implementation across components

## Accessibility Testing

### Automated Testing
Run the accessibility test suite:
```bash
./scripts/test-accessibility.sh
```

### Manual Testing Checklist
- [ ] Screen reader navigation (NVDA, JAWS, VoiceOver)
- [ ] Keyboard-only navigation
- [ ] Tab order verification
- [ ] Focus indicator visibility
- [ ] Color contrast ratios
- [ ] Form validation announcements
- [ ] Error message accessibility
- [ ] Skip link functionality

### Browser Testing
Test with accessibility tools:
- Chrome DevTools Accessibility tab
- Firefox Accessibility Inspector
- axe-core browser extension
- WAVE Web Accessibility Evaluation Tool

## Code Standards

### ARIA Best Practices
1. **Use semantic HTML first** - Only use ARIA when necessary
2. **Don't change semantics** - Use ARIA to enhance, not replace
3. **Ensure keyboard accessibility** - All interactive elements must be keyboard accessible
4. **Provide accessible names** - Use `aria-label` or `aria-labelledby`
5. **Manage focus** - Ensure focus is managed properly in dynamic content

### Image Accessibility
```tsx
// Good - Descriptive alt text
<img src="profile.jpg" alt="John Doe - Coach profile picture" />

// Good - Decorative image
<img src="decoration.png" alt="" role="presentation" />

// Bad - Missing alt text
<img src="profile.jpg" />
```

### Form Accessibility
```tsx
// Good - Proper labeling and error handling
<Label htmlFor="email">Email Address</Label>
<Input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid={errors.email ? 'true' : 'false'}
/>
{errors.email && (
  <p id="email-error" role="alert">{errors.email.message}</p>
)}
```

### Button Accessibility
```tsx
// Good - Toggle button with proper ARIA
<Button
  aria-pressed={isExpanded}
  aria-label={isExpanded ? 'Collapse menu' : 'Expand menu'}
  onClick={toggleMenu}
>
  <ChevronDown aria-hidden="true" />
</Button>
```

## Internationalization & Accessibility

### RTL Support
- Proper `dir` attribute on HTML element
- CSS logical properties for layout
- Icon direction adjustments

### Language Support
- `lang` attribute for language switching
- Proper Hebrew translations for accessibility terms
- Screen reader support for both languages

## Testing Infrastructure

### Unit Tests
Located in `src/test/accessibility.test.ts`:
- ARIA attribute testing
- Keyboard navigation testing
- Screen reader support testing
- Form accessibility testing

### Integration Tests
- Component accessibility testing
- User interaction testing
- Cross-browser compatibility

## Common Accessibility Issues & Solutions

### Issue: Missing Form Labels
**Problem**: Form inputs without proper labels
**Solution**: Always use `<Label>` component with `htmlFor` attribute

### Issue: Poor Color Contrast
**Problem**: Text doesn't meet WCAG contrast requirements
**Solution**: Use design system colors that meet AA standards

### Issue: Missing Focus Indicators
**Problem**: Focus not visible for keyboard users
**Solution**: CSS `:focus` styles with sufficient contrast

### Issue: Inadequate Error Messages
**Problem**: Error messages not announced to screen readers
**Solution**: Use `role="alert"` and `aria-describedby`

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Accessibility Guidelines](https://webaim.org/standards/wcag/)

### Testing Tools
- [axe-core](https://www.deque.com/axe/) - Automated accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance and accessibility auditing

### Screen Readers
- [NVDA](https://www.nvaccess.org/) - Free Windows screen reader
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) - Popular Windows screen reader
- [VoiceOver](https://support.apple.com/guide/voiceover/) - Built-in macOS/iOS screen reader

## Implementation Status

### Completed ✅
- [x] Skip navigation links
- [x] Navigation ARIA attributes
- [x] Password toggle accessibility
- [x] Session booking form accessibility
- [x] Avatar alt text improvements
- [x] Testing infrastructure

### In Progress 🔄
- Form validation announcements
- Advanced keyboard navigation patterns
- High contrast mode support

### Future Enhancements 📋
- Live region announcements for dynamic content
- Custom component accessibility patterns
- Advanced screen reader optimization
- Voice control support

## Maintenance

### Regular Tasks
1. Run accessibility tests with each release
2. Update alt text when images change
3. Test with latest screen reader versions
4. Review new components for accessibility compliance

### Monitoring
- Set up automated accessibility testing in CI/CD
- Monitor accessibility metrics
- Collect user feedback on accessibility issues
- Regular accessibility audits

## Support

For accessibility questions or issues:
1. Check this documentation first
2. Review WCAG 2.1 guidelines
3. Test with screen readers
4. Consult accessibility testing tools
5. Reach out to the development team

---

*This document is part of the Loom therapy platform accessibility implementation. Last updated: July 2025*