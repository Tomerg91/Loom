import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground" />
        </div>
        
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Access Denied
        </h1>
        
        <p className="mb-6 text-muted-foreground">
          You don&apos;t have permission to access this resource. Please contact an administrator if you believe this is a mistake.
        </p>
        
        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href="/">Go to homepage</Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}