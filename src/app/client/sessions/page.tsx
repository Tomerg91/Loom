// Server redirect to localized route to ensure proper providers
export const dynamic = 'force-dynamic';
export const revalidate = false;

import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default function Page() {
  const locale = routing.defaultLocale;
  redirect(`/${locale}/client/sessions`);
}
// The actual page has been moved to /[locale]/client/sessions
