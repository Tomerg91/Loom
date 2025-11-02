import { NavMenu } from '@/components/navigation/nav-menu';
import type { AuthUser } from '@/lib/auth/auth';

interface AppLayoutProps {
  children: React.ReactNode;
  user: AuthUser;
  /**
   * When true the navigation menu will subscribe to client-side auth store
   * updates after the initial server render. Disable in streaming contexts
   * where minimizing hydration work is preferred.
   */
  hydrateNav?: boolean;
}

export function AppLayout({ children, user, hydrateNav = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavMenu user={user} hydrateFromStore={hydrateNav} />
      <main className="flex-1 pb-safe-area-bottom">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}

