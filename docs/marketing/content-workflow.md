# Marketing Content Workflow

This document explains how product marketing can update the Loom-app landing page without engineering changes.

## Content source

All hero, feature, testimonial, pricing, and CTA copy is authored in locale-specific JSON files:

- `src/i18n/locales/en/landing.json`
- `src/i18n/locales/he/landing.json`

Each file follows the schema defined in `src/modules/platform/cms/types.ts`. The marketing CMS client (`src/modules/platform/cms/client.ts`) validates authored content at runtime, ensuring missing fields are surfaced during development builds.

## Editing guidelines

1. **Keep URLs accurate** – Internal links should start with `/` so they automatically adopt the active locale. External links can include `https://` or `mailto:` prefixes.
2. **Maintain array lengths** – Provide at least three feature cards and one testimonial. The validation schema will throw if required items are omitted.
3. **Localized badge labels** – Plans flagged as `popular` should also include a `"badgeLabel"` value for language-specific text.
4. **Preview cards** – Add or update the hero `previewCards` array to align with the locale-specific microcopy shown inside the hero illustration.
5. **Encoding** – Save files as UTF-8 to preserve right-to-left characters.

## Publishing workflow

1. Open the relevant JSON file and update the necessary copy.
2. Run `npm run lint src/app/[locale]/page.tsx` to ensure schema validation passes locally.
3. Commit changes through the normal review process. The CI pipeline will run the same validation via the Next.js build step.
4. After deploy, review the live marketing page in both English and Hebrew to confirm layout integrity, especially for RTL typography.

## Future CMS integration

If the team adopts a headless CMS, replace the JSON imports inside `src/modules/platform/cms/client.ts` with the SDK fetch calls. Keep the Zod validation to maintain runtime safety and authoring ergonomics.
