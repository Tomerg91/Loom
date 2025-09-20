import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hero } from '@/components/ui/hero';
import { Tile } from '@/components/ui/tile';
import { Link } from '@/i18n/routing';
import { Users, Calendar, BookOpen, Zap, Globe, Shield } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero
        title="Loom"
        subtitle="A Modern Coaching Platform"
        description="Empowering coaches and clients with beautiful, professional tools for growth and development."
      >
        {/* Language Switcher */}
        <div className="flex gap-2 mb-6">
          <Link href="/" locale="en">
            <Button variant="outline" size="sm">
              English
            </Button>
          </Link>
          <Link href="/" locale="he">
            <Button variant="outline" size="sm">
              עברית
            </Button>
          </Link>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link href="/dashboard" locale="en">
            <Button size="lg">
              Get Started
            </Button>
          </Link>
          <Link href="/dashboard" locale="he">
            <Button size="lg" variant="secondary">
              התחל כעת
            </Button>
          </Link>
        </div>
      </Hero>

      <div className="container mx-auto px-4 py-16">

        {/* Feature Tiles */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Tile
            variant="orange"
            size="lg"
            icon={<Users className="h-8 w-8 text-orange-600" />}
            title="For Coaches"
            description="Manage your coaching practice with powerful tools designed for professional growth."
            badge={<Badge className="bg-orange-100 text-orange-800 border-orange-200">Coach</Badge>}
            action={
              <Link href="/coach" locale="en">
                <Button variant="outline" size="sm" className="w-full">
                  Coach Dashboard
                </Button>
              </Link>
            }
          />

          <Tile
            variant="default"
            size="lg"
            icon={<BookOpen className="h-8 w-8 text-neutral-600" />}
            title="For Clients"
            description="Track your personal development journey with intuitive tools and insights."
            badge={<Badge className="bg-neutral-100 text-neutral-800 border-neutral-200">Client</Badge>}
            action={
              <Link href="/client" locale="en">
                <Button variant="outline" size="sm" className="w-full">
                  Client Portal
                </Button>
              </Link>
            }
          />

          <Tile
            variant="red"
            size="lg"
            icon={<Calendar className="h-8 w-8 text-red-600" />}
            title="Sessions"
            description="Seamless session management and scheduling for coaches and clients."
            badge={<Badge className="bg-red-100 text-red-800 border-red-200">Sessions</Badge>}
            action={
              <Link href="/sessions" locale="en">
                <Button variant="outline" size="sm" className="w-full">
                  View Sessions
                </Button>
              </Link>
            }
          />
        </div>

        {/* Technology Stack */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extralight text-neutral-900 mb-8">Built with Modern Technology</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="outline" className="text-sm font-light">Next.js 15</Badge>
            <Badge variant="outline" className="text-sm font-light">React 19</Badge>
            <Badge variant="outline" className="text-sm font-light">TypeScript</Badge>
            <Badge variant="outline" className="text-sm font-light">Supabase</Badge>
            <Badge variant="outline" className="text-sm font-light">Tailwind CSS</Badge>
            <Badge variant="outline" className="text-sm font-light">Radix UI</Badge>
            <Badge variant="outline" className="text-sm font-light">next-intl</Badge>
            <Badge variant="outline" className="text-sm font-light">Zustand</Badge>
            <Badge variant="outline" className="text-sm font-light">TanStack Query</Badge>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8">
          <Tile
            variant="ghost"
            size="md"
            icon={<Zap className="h-6 w-6 text-orange-600" />}
            title="Fast & Reliable"
            description="Built on modern architecture for lightning-fast performance and reliability."
          />
          
          <Tile
            variant="ghost"
            size="md"
            icon={<Globe className="h-6 w-6 text-orange-600" />}
            title="Multilingual"
            description="Support for multiple languages including English and Hebrew interfaces."
          />
          
          <Tile
            variant="ghost"
            size="md"
            icon={<Shield className="h-6 w-6 text-orange-600" />}
            title="Secure & Private"
            description="Enterprise-grade security with MFA and role-based access controls."
          />
        </div>
      </div>
    </div>
  );
}
