import { redirect } from 'next/navigation';

// Admin page redirects to admin/users as the default
export default function AdminPage() {
  redirect('/admin/users');
}