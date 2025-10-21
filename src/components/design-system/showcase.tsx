'use client'

import { Star, Users, Zap, Shield, ArrowRight, Check, Play } from 'lucide-react'
import * as React from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Hero } from '@/components/ui/hero'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tile } from '@/components/ui/tile'

// Design System Color Palette Component
const ColorPalette = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-2xl font-light mb-6 text-neutral-900">Color Palette</h3>
      
      {/* Primary Colors */}
      <div className="mb-8">
        <h4 className="text-lg font-normal mb-4 text-neutral-700">Primary Colors</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="w-full h-16 bg-orange-600 rounded-lg shadow-sm"></div>
            <p className="text-sm font-light text-neutral-600">Dark Orange</p>
            <p className="text-xs font-mono text-neutral-500">#ea580c</p>
          </div>
          <div className="space-y-2">
            <div className="w-full h-16 bg-orange-500 rounded-lg shadow-sm"></div>
            <p className="text-sm font-light text-neutral-600">Orange</p>
            <p className="text-xs font-mono text-neutral-500">#f97316</p>
          </div>
          <div className="space-y-2">
            <div className="w-full h-16 bg-red-500 rounded-lg shadow-sm"></div>
            <p className="text-sm font-light text-neutral-600">Red</p>
            <p className="text-xs font-mono text-neutral-500">#ef4444</p>
          </div>
          <div className="space-y-2">
            <div className="w-full h-16 bg-neutral-900 rounded-lg shadow-sm"></div>
            <p className="text-sm font-light text-neutral-600">Black</p>
            <p className="text-xs font-mono text-neutral-500">#171717</p>
          </div>
        </div>
      </div>

      {/* Neutral Colors */}
      <div className="mb-8">
        <h4 className="text-lg font-normal mb-4 text-neutral-700">Neutral Colors</h4>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[50, 100, 300, 500, 700, 900].map((shade) => (
            <div key={shade} className="space-y-2">
              <div className={`w-full h-12 bg-neutral-${shade} rounded-lg shadow-sm border border-neutral-200`}></div>
              <p className="text-xs font-light text-neutral-600">{shade}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

// Typography Showcase Component
const TypographyShowcase = () => (
  <div className="space-y-8">
    <h3 className="text-2xl font-light mb-6 text-neutral-900">Typography</h3>
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl md:text-6xl font-extralight text-neutral-900 mb-2">Heading 1</h1>
        <p className="text-sm text-neutral-500 font-mono">font-extralight, 4xl md:6xl</p>
      </div>
      <div>
        <h2 className="text-3xl md:text-4xl font-light text-neutral-900 mb-2">Heading 2</h2>
        <p className="text-sm text-neutral-500 font-mono">font-light, 3xl md:4xl</p>
      </div>
      <div>
        <h3 className="text-2xl font-light text-neutral-900 mb-2">Heading 3</h3>
        <p className="text-sm text-neutral-500 font-mono">font-light, 2xl</p>
      </div>
      <div>
        <p className="text-lg font-light text-neutral-700 mb-2">Body Large - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        <p className="text-sm text-neutral-500 font-mono">font-light, lg</p>
      </div>
      <div>
        <p className="text-base font-light text-neutral-600 mb-2">Body Regular - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        <p className="text-sm text-neutral-500 font-mono">font-light, base</p>
      </div>
      <div>
        <p className="text-sm font-light text-neutral-500 mb-2">Body Small - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        <p className="text-sm text-neutral-500 font-mono">font-light, sm</p>
      </div>
    </div>
  </div>
)

// Button Showcase Component
const ButtonShowcase = () => (
  <div className="space-y-8">
    <h3 className="text-2xl font-light mb-6 text-neutral-900">Buttons</h3>
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-normal mb-4 text-neutral-700">Primary Buttons</h4>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Primary Orange</Button>
          <Button variant="orange">Light Orange</Button>
          <Button variant="red">Red Accent</Button>
        </div>
      </div>
      <div>
        <h4 className="text-lg font-normal mb-4 text-neutral-700">Secondary Buttons</h4>
        <div className="flex flex-wrap gap-4">
          <Button variant="secondary">Black Button</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link Button</Button>
        </div>
      </div>
      <div>
        <h4 className="text-lg font-normal mb-4 text-neutral-700">Button Sizes</h4>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>
    </div>
  </div>
)

// Form Components Showcase
const FormShowcase = () => (
  <div className="space-y-8">
    <h3 className="text-2xl font-light mb-6 text-neutral-900">Form Components</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <Input 
          label="Email Address" 
          type="email" 
          placeholder="enter@example.com"
          variant="default"
        />
        <Input 
          label="Password" 
          type="password" 
          placeholder="Enter your password"
          variant="filled"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-900">Country</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="ca">Canada</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="de">Germany</SelectItem>
              <SelectItem value="fr">France</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-6">
        <Input 
          label="Phone Number" 
          type="tel" 
          placeholder="+1 (555) 123-4567"
          helperText="We'll never share your phone number."
        />
        <Input 
          label="Error Example" 
          type="text" 
          placeholder="This field has an error"
          error="This field is required"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-900">Plan Type</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose your plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free Plan</SelectItem>
              <SelectItem value="pro">Pro Plan</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
)

// Tile Components Showcase
const TileShowcase = () => (
  <div className="space-y-8">
    <h3 className="text-2xl font-light mb-6 text-neutral-900">Tiles</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Tile
        variant="default"
        icon={<Zap className="h-6 w-6 text-orange-600" />}
        title="Fast Performance"
        description="Lightning-fast load times and smooth interactions for the best user experience."
        action={<Button variant="ghost" size="sm">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Button>}
      />
      <Tile
        variant="elevated"
        icon={<Shield className="h-6 w-6 text-red-600" />}
        title="Secure & Reliable"
        description="Enterprise-grade security with 99.9% uptime guarantee and advanced encryption."
        badge={<Badge variant="secondary">Popular</Badge>}
      />
      <Tile
        variant="orange"
        icon={<Users className="h-6 w-6 text-orange-700" />}
        title="Team Collaboration"
        description="Work together seamlessly with real-time collaboration and shared workspaces."
        action={<Button variant="secondary" size="sm">Get Started</Button>}
      />
    </div>
  </div>
)

// Table Showcase Component
const TableShowcase = () => (
  <div className="space-y-8">
    <h3 className="text-2xl font-light mb-6 text-neutral-900">Table</h3>
    <Table>
      <TableCaption>A list of recent customers and their subscription plans.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <span>John Doe</span>
            </div>
          </TableCell>
          <TableCell>Pro</TableCell>
          <TableCell>
            <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
          </TableCell>
          <TableCell className="text-right">$299</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback>SM</AvatarFallback>
              </Avatar>
              <span>Sarah Miller</span>
            </div>
          </TableCell>
          <TableCell>Enterprise</TableCell>
          <TableCell>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
          </TableCell>
          <TableCell className="text-right">$999</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback>MB</AvatarFallback>
              </Avatar>
              <span>Mike Brown</span>
            </div>
          </TableCell>
          <TableCell>Free</TableCell>
          <TableCell>
            <Badge variant="outline" className="border-neutral-300">Trial</Badge>
          </TableCell>
          <TableCell className="text-right">$0</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
)

// Main Design System Showcase
export const DesignSystemShowcase = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero
        title="Developers Digest"
        subtitle="Modern SaaS Platform"
        description="Experience our clean, professional design system with light backgrounds, dark accents, and beautiful orange and red primary colors."
        backgroundVariant="gradient"
        titleSize="xl"
      >
        <Button size="lg" className="mr-4">
          Get Started <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button variant="outline" size="lg">
          <Play className="mr-2 h-5 w-5" />
          Watch Demo
        </Button>
      </Hero>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-neutral-900 mb-4">
              Everything you need to build amazing products
            </h2>
            <p className="text-lg font-light text-neutral-600 max-w-2xl mx-auto">
              Our platform provides all the tools and components you need to create beautiful, 
              professional applications with ease.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {[
              {
                icon: <Zap className="h-8 w-8 text-orange-600" />,
                title: "Lightning Fast",
                description: "Optimized for speed and performance with modern web technologies."
              },
              {
                icon: <Shield className="h-8 w-8 text-red-600" />,
                title: "Secure by Default",
                description: "Built with security best practices and enterprise-grade protection."
              },
              {
                icon: <Users className="h-8 w-8 text-orange-600" />,
                title: "Team Focused",
                description: "Designed for collaboration with powerful team management features."
              }
            ].map((feature, index) => (
              <Tile
                key={index}
                variant="default"
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                size="lg"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Design System Showcase */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-neutral-900 mb-4">
              Design System Components
            </h2>
            <p className="text-lg font-light text-neutral-600 max-w-2xl mx-auto">
              Explore our comprehensive design system built with modern web standards.
            </p>
          </div>

          <div className="space-y-20">
            <ColorPalette />
            <TypographyShowcase />
            <ButtonShowcase />
            <FormShowcase />
            <TileShowcase />
            <TableShowcase />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-orange-600">
        <div className="max-w-4xl mx-auto text-center px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg font-light text-orange-100 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already building amazing products with our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-orange-600">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}