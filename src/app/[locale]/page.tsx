import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 gradient-primary bg-clip-text text-transparent">
            Loom
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t('common.welcome')} - A Modern Coaching Platform
          </p>
          
          {/* Language Switcher */}
          <div className="flex justify-center gap-2 mb-8">
            <Link href="/en">
              <Button variant="outline" size="sm">
                English
              </Button>
            </Link>
            <Link href="/he">
              <Button variant="outline" size="sm">
                עברית
              </Button>
            </Link>
          </div>
        </header>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="coach">Coach</Badge>
                {t('navigation.coaches')}
              </CardTitle>
              <CardDescription>
                Manage your coaching practice with powerful tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {t('coach.clientNotes')}</li>
                <li>• {t('coach.availability')}</li>
                <li>• {t('session.sessionHistory')}</li>
                <li>• {t('dashboard.statistics')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="client">Client</Badge>
                {t('navigation.clients')}
              </CardTitle>
              <CardDescription>
                Track your personal development journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {t('session.bookSession')}</li>
                <li>• {t('client.reflections')}</li>
                <li>• {t('client.myCoach')}</li>
                <li>• {t('session.sessionHistory')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="success">Sessions</Badge>
                {t('navigation.sessions')}
              </CardTitle>
              <CardDescription>
                Seamless session management and scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {t('session.scheduleSession')}</li>
                <li>• {t('session.rescheduleSession')}</li>
                <li>• {t('session.sessionNotes')}</li>
                <li>• {t('calendar.calendar')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Technology Stack */}
        <div className="text-center">
          <h2 className="text-3xl font-semibold mb-8">Built with Modern Technology</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="outline">Next.js 15</Badge>
            <Badge variant="outline">React 19</Badge>
            <Badge variant="outline">TypeScript</Badge>
            <Badge variant="outline">Supabase</Badge>
            <Badge variant="outline">Tailwind CSS</Badge>
            <Badge variant="outline">Radix UI</Badge>
            <Badge variant="outline">next-intl</Badge>
            <Badge variant="outline">Zustand</Badge>
            <Badge variant="outline">TanStack Query</Badge>
          </div>
          
          <div className="mt-12">
            <Link href="/en/dashboard">
              <Button size="lg" className="mr-4">
                Get Started
              </Button>
            </Link>
            <Link href="/he/dashboard">
              <Button size="lg" variant="outline">
                התחל כעת
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
