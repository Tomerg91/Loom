// Server component for environment validation
import { AlertCircle, ExternalLink, Settings } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { clientEnv } from '@/env/client';

interface EnvironmentError {
  variable: string;
  value: string;
  required: boolean;
}

function checkEnvironmentVariables(): EnvironmentError[] {
  const errors: EnvironmentError[] = [];
  
  // Check for missing required variables
  if (clientEnv.NEXT_PUBLIC_SUPABASE_URL?.startsWith('MISSING_') || clientEnv.NEXT_PUBLIC_SUPABASE_URL?.startsWith('INVALID_')) {
    errors.push({
      variable: 'NEXT_PUBLIC_SUPABASE_URL',
      value: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      required: true,
    });
  }
  
  if (clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('MISSING_')) {
    errors.push({
      variable: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      value: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      required: true,
    });
  }
  
  // Validate URL format for existing URLs
  if (clientEnv.NEXT_PUBLIC_SUPABASE_URL &&
      !clientEnv.NEXT_PUBLIC_SUPABASE_URL.startsWith('MISSING_') &&
      !clientEnv.NEXT_PUBLIC_SUPABASE_URL.startsWith('INVALID_')) {
    try {
      new URL(clientEnv.NEXT_PUBLIC_SUPABASE_URL);
    } catch (_error) {
      errors.push({
        variable: 'NEXT_PUBLIC_SUPABASE_URL',
        value: `Invalid URL format: ${clientEnv.NEXT_PUBLIC_SUPABASE_URL}`,
        required: true,
      });
    }
  }
  
  return errors;
}

function getDeploymentInstructions(variable: string): string {
  const baseInstructions = `To fix this error:

1. **Vercel Dashboard Method:**
   - Go to your project settings in Vercel
   - Navigate to Environment Variables
   - Add ${variable} with your Supabase ${variable.replace('NEXT_PUBLIC_SUPABASE_', '').toLowerCase()}
   
2. **Vercel CLI Method:**
   \`vercel env add ${variable}\`
   
3. **After adding variables:**
   - Redeploy your application
   - Or run \`vercel --prod\` to trigger a new deployment`;
   
  return baseInstructions;
}

export function EnvironmentCheck() {
  const errors = checkEnvironmentVariables();
  
  if (errors.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle className="text-destructive">Configuration Error</CardTitle>
            </div>
            <CardDescription>
              Missing required environment variables. The application cannot start without proper configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.map((error) => (
              <Alert key={error.variable} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Missing: {error.variable}</AlertTitle>
                <AlertDescription className="mt-2">
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                    {getDeploymentInstructions(error.variable)}
                  </pre>
                </AlertDescription>
              </Alert>
            ))}
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button 
                variant="outline" 
                asChild
                className="flex items-center gap-2"
              >
                <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Vercel Dashboard
                </a>
              </Button>
              <Button 
                variant="outline"
                asChild
                className="flex items-center gap-2"
              >
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                  <Settings className="h-4 w-4" />
                  Open Supabase Dashboard
                </a>
              </Button>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Need Help?</AlertTitle>
              <AlertDescription>
                Check the project's <code>DEPLOYMENT_TROUBLESHOOTING.md</code> file for detailed setup instructions,
                or run <code>npm run setup:vercel-env</code> locally for a list of required variables.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
