import Link from 'next/link';
import { CompactLanguageSwitcher } from '@/components/ui/language-switcher';

export function AppFooter() {
  return (
    <footer className="mt-10 border-t border-border/60 bg-card/50 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Loom. All rights reserved.
        </div>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
          <CompactLanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}

