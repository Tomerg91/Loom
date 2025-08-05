#!/usr/bin/env node

/**
 * Language Switching Verification Script
 * 
 * This script performs various checks to verify that the language switching
 * functionality is working correctly in the Loom app.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Language Switching Functionality\n');

const errors = [];
const warnings = [];
const success = [];

// Helper function to check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Helper function to read JSON file
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Helper function to read TypeScript/JavaScript file
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

// 1. Check i18n configuration files
console.log('1️⃣ Checking i18n Configuration Files...');

const i18nConfigPath = path.join(process.cwd(), 'src/i18n/config.ts');
const i18nRoutingPath = path.join(process.cwd(), 'src/i18n/routing.ts');

if (fileExists(i18nConfigPath)) {
  success.push('✅ i18n config file exists');
  
  const configContent = readFile(i18nConfigPath);
  if (configContent.includes('defaultLocale')) {
    success.push('✅ Default locale is configured');
  } else {
    errors.push('❌ Default locale not found in config');
  }
} else {
  errors.push('❌ i18n config file not found');
}

if (fileExists(i18nRoutingPath)) {
  success.push('✅ i18n routing file exists');
  
  const routingContent = readFile(i18nRoutingPath);
  if (routingContent.includes("defaultLocale: 'he'")) {
    success.push('✅ Hebrew is set as default locale');
  } else {
    errors.push('❌ Hebrew is not set as default locale');
  }
  
  if (routingContent.includes("locales: ['en', 'he']")) {
    success.push('✅ Both English and Hebrew locales are configured');
  } else {
    warnings.push('⚠️ Locale configuration might be different than expected');
  }
  
  if (routingContent.includes("localePrefix: 'always'")) {
    success.push('✅ Locale prefix is set to always');
  } else {
    warnings.push('⚠️ Locale prefix configuration might affect routing');
  }
} else {
  errors.push('❌ i18n routing file not found');
}

// 2. Check message files
console.log('\n2️⃣ Checking Message Files...');

const heMessagesPath = path.join(process.cwd(), 'src/messages/he.json');
const enMessagesPath = path.join(process.cwd(), 'src/messages/en.json');

if (fileExists(heMessagesPath)) {
  success.push('✅ Hebrew messages file exists');
  
  const heMessages = readJsonFile(heMessagesPath);
  if (heMessages && heMessages.common && heMessages.common.language) {
    success.push('✅ Hebrew messages contain language strings');
  } else {
    warnings.push('⚠️ Hebrew messages might be incomplete');
  }
} else {
  errors.push('❌ Hebrew messages file not found');
}

if (fileExists(enMessagesPath)) {
  success.push('✅ English messages file exists');
  
  const enMessages = readJsonFile(enMessagesPath);
  if (enMessages && enMessages.common && enMessages.common.language) {
    success.push('✅ English messages contain language strings');
  } else {
    warnings.push('⚠️ English messages might be incomplete');
  }
} else {
  errors.push('❌ English messages file not found');
}

// 3. Check useLanguageSwitcher hook
console.log('\n3️⃣ Checking Language Switcher Hook...');

const hookPath = path.join(process.cwd(), 'src/hooks/use-language-switcher.ts');

if (fileExists(hookPath)) {
  success.push('✅ Language switcher hook exists');
  
  const hookContent = readFile(hookPath);
  
  if (hookContent.includes('rtl: true') && hookContent.includes("code: 'he'")) {
    success.push('✅ Hebrew is configured as RTL');
  } else {
    errors.push('❌ Hebrew RTL configuration not found');
  }
  
  if (hookContent.includes('rtl: false') && hookContent.includes("code: 'en'")) {
    success.push('✅ English is configured as LTR');
  } else {
    errors.push('❌ English LTR configuration not found');
  }
  
  if (hookContent.includes('switchLanguage')) {
    success.push('✅ Language switching function exists');
  } else {
    errors.push('❌ Language switching function not found');
  }
  
  if (hookContent.includes('isRTL')) {
    success.push('✅ RTL detection function exists');
  } else {
    errors.push('❌ RTL detection function not found');
  }
  
  if (hookContent.includes('getCurrentLanguage')) {
    success.push('✅ Current language getter exists');
  } else {
    warnings.push('⚠️ Current language getter might have different name');
  }
} else {
  errors.push('❌ Language switcher hook not found');
}

// 4. Check language switcher component
console.log('\n4️⃣ Checking Language Switcher Component...');

const componentPath = path.join(process.cwd(), 'src/components/ui/language-switcher.tsx');

if (fileExists(componentPath)) {
  success.push('✅ Language switcher component exists');
  
  const componentContent = readFile(componentPath);
  
  if (componentContent.includes('useLanguageSwitcher')) {
    success.push('✅ Component uses the language switcher hook');
  } else {
    errors.push('❌ Component does not use the language switcher hook');
  }
  
  if (componentContent.includes('switchLanguage')) {
    success.push('✅ Component implements language switching');
  } else {
    errors.push('❌ Component does not implement language switching');
  }
  
  if (componentContent.includes('DropdownMenu') || componentContent.includes('Select')) {
    success.push('✅ Component provides UI for language selection');
  } else {
    warnings.push('⚠️ Component UI implementation might be different');
  }
} else {
  errors.push('❌ Language switcher component not found');
}

// 5. Check middleware for locale handling
console.log('\n5️⃣ Checking Middleware Configuration...');

const middlewarePath = path.join(process.cwd(), 'src/middleware.ts');

if (fileExists(middlewarePath)) {
  success.push('✅ Middleware file exists');
  
  const middlewareContent = readFile(middlewarePath);
  
  if (middlewareContent.includes('next-intl/middleware')) {
    success.push('✅ next-intl middleware is imported');
  } else {
    errors.push('❌ next-intl middleware not found');
  }
  
  if (middlewareContent.includes('routing') && middlewareContent.includes('i18n')) {
    success.push('✅ Middleware uses i18n routing configuration');
  } else {
    warnings.push('⚠️ Middleware might not be properly configured for i18n');
  }
  
  if (middlewareContent.includes('intlMiddleware')) {
    success.push('✅ Internationalization middleware is set up');
  } else {
    warnings.push('⚠️ i18n middleware setup might be different');
  }
} else {
  errors.push('❌ Middleware file not found');
}

// 6. Check if test files exist
console.log('\n6️⃣ Checking Test Files...');

const testPath = path.join(process.cwd(), 'src/test/language-switching.test.ts');
const integrationTestPath = path.join(process.cwd(), 'src/test/integration/language-routing.test.tsx');

if (fileExists(testPath)) {
  success.push('✅ Language switching unit tests exist');
} else {
  warnings.push('⚠️ Language switching unit tests not found');
}

if (fileExists(integrationTestPath)) {
  success.push('✅ Language routing integration tests exist');
} else {
  warnings.push('⚠️ Language routing integration tests not found');
}

// 7. Final summary
console.log('\n📋 Verification Summary:');
console.log('='.repeat(50));

if (success.length > 0) {
  console.log('\n✅ Successful Checks:');
  success.forEach(item => console.log(`  ${item}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️ Warnings:');
  warnings.forEach(item => console.log(`  ${item}`));
}

if (errors.length > 0) {
  console.log('\n❌ Errors Found:');
  errors.forEach(item => console.log(`  ${item}`));
}

console.log(`\n📊 Results: ${success.length} passed, ${warnings.length} warnings, ${errors.length} errors`);

// 8. Manual testing instructions
console.log('\n🧪 Manual Testing Instructions:');
console.log('='.repeat(50));
console.log(`
To manually verify the language switching functionality:

1. Start the development server:
   npm run dev

2. Test Hebrew as default locale:
   - Visit http://localhost:3000
   - Should redirect to http://localhost:3000/he
   - Content should be in Hebrew and display RTL

3. Test English locale:
   - Visit http://localhost:3000/en
   - Content should be in English and display LTR

4. Test language switching:
   - Use the language switcher in the UI
   - URL should change between /he and /en
   - Content should change languages accordingly

5. Test invalid locale handling:
   - Visit http://localhost:3000/fr/dashboard
   - Should redirect to http://localhost:3000/he/dashboard

6. Test routing preservation:
   - Visit http://localhost:3000/he/dashboard
   - Switch to English
   - Should navigate to http://localhost:3000/en/dashboard

7. Run automated tests:
   npm run test src/test/language-switching.test.ts
   npm run test src/test/integration/language-routing.test.tsx
`);

// Exit with appropriate code
process.exit(errors.length > 0 ? 1 : 0);