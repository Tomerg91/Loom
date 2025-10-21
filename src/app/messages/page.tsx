export const dynamic = 'force-dynamic';
export const revalidate = false;

import { redirect } from 'next/navigation';

import { routing } from '@/i18n/routing';

export default function MessagesRedirectPage() {
  redirect(`/${routing.defaultLocale}/messages`);
}

