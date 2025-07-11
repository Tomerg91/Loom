import { redirect } from 'next/navigation';

// Force dynamic rendering to avoid prerender issues with event handlers
export const dynamic = 'force-dynamic';

// Admin page redirects to admin/users as the default
export default function AdminPage() {
  redirect('/admin/users');
}