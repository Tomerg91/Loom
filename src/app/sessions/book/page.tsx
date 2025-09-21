// Server component wrapper to force dynamic rendering (prevents prerender errors)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import BookSessionClient from './page.client';

export default function BookSessionPage() {
  return <BookSessionClient />;
}
