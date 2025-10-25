#!/bin/sh

# @src/components/dashboard/coach/quick-actions.tsx
sed -i '' -E \
  -e '/^ *translations: DashboardTranslations; *$/d' \
  -e '1i\
import { useTranslations } from "next-intl";
' \
  -e "s/const { dashboard: t } = translations;/const t = useTranslations('dashboard.coach.quick-actions');/" \
  -e "s/t\\.quick[-_]actions\\.([a-zA-Z0-9._-]+)/t('\\1')/g" \
  src/components/dashboard/coach/quick-actions.tsx

# @src/components/dashboard/coach/client-snapshot.tsx
sed -i '' -E \
  -e '/^ *translations: DashboardTranslations; *$/d' \
  -e '1i\
import { useTranslations } from "next-intl";
' \
  -e "s/const { dashboard: t } = translations;/const t = useTranslations('dashboard.coach.client-snapshot');/" \
  -e "s/t\\.client[-_]snapshot\\.([a-zA-Z0-9._-]+)/t('\\1')/g" \
  src/components/dashboard/coach/client-snapshot.tsx

# @src/components/dashboard/coach/recent-activity-feed.tsx
sed -i '' -E \
  -e '/^ *translations: DashboardTranslations; *$/d' \
  -e '1i\
import { useTranslations } from "next-intl";
' \
  -e "s/const { dashboard: t } = translations;/const t = useTranslations('dashboard.coach.recent-activity-feed');/" \
  -e "s/t\\.recent[-_]activity[-_]feed\\.([a-zA-Z0-9._-]+)/t('\\1')/g" \
  src/components/dashboard/coach/recent-activity-feed.tsx
