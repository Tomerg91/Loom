'use client';

import { useEffect, useState } from 'react';
import { FileManagementPage } from '@/components/files/file-management-page';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface User {
  id: string;
  role: 'coach' | 'client' | 'admin';
}

export default function FilesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error || !authUser) {
          router.push('/login');
          return;
        }

        // Get user profile with role
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('Error getting user profile:', profileError);
          router.push('/login');
          return;
        }

        setUser({
          id: profile.id,
          role: profile.role as 'coach' | 'client' | 'admin',
        });
      } catch (error) {
        console.error('Error in getUser:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="h-screen flex flex-col">
      <FileManagementPage
        userId={user.id}
        userRole={user.role}
        className="flex-1"
      />
    </div>
  );
}