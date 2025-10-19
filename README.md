# Loom App 🚀

A modern, professional coaching platform built with Next.js 15, featuring a beautiful design system and comprehensive authentication flow.

## ✨ Features

### 📚 Resource Library (NEW!)

Comprehensive content management system for coaches to share educational materials with clients:

**For Coaches:**

- Upload and organize resources (PDFs, videos, audio, documents)
- Create themed collections for structured learning paths
- Share resources with all clients or individually
- Auto-share resources with new clients
- Track engagement with detailed analytics dashboard
- View top performing resources and client engagement metrics

**For Clients:**

- Access resources shared by coaches
- Track progress with automatic "viewed" and manual "completed" markers
- Filter and search resources by category, tags, or keywords
- Browse themed collections
- View personal progress statistics

**Technical Highlights:**

- Row-Level Security (RLS) enforced at database level
- Comprehensive analytics with time-range filtering
- Drag-and-drop collection organization
- Real-time progress tracking
- Category-based organization system

See [Features Guide](docs/FEATURES.md#resource-library) for detailed documentation.

### 🎨 Modern Design System

- **Professional SaaS Aesthetic**: Clean, light backgrounds with sophisticated dark accents
- **Orange & Red Color Scheme**: Primary colors using dark orange (#ea580c) and red (#ef4444)
- **Thin Typography**: Inter font with light weights (300/200) for a professional look
- **No Gradients**: Solid colors throughout for a clean, modern appearance
- **Responsive Design**: Mobile-first approach with beautiful animations

### 🔐 Authentication & Security

- **Modern Sign In/Up Pages**: Redesigned with new design system
- **Multi-Factor Authentication (MFA)**: Enhanced security with TOTP support
- **Password Reset Flow**: Professional reset process with email verification
- **Role-Based Access**: Client and Coach user types with route guards
- **Internationalization**: English and Hebrew language support
- **Security Hardening**: SECURITY DEFINER functions with secure search_path
- **Enhanced Auth Config**: 15-minute OTP expiry, email confirmation required
- **Database Health Monitoring**: Built-in health check function for critical systems

See [Admin Guide](docs/ADMIN_GUIDE.md) for security monitoring and maintenance procedures.

### 🧩 Component Library

- **Buttons**: Orange primary, black secondary, red accent variants
- **Form Inputs**: Clean styling with orange focus states
- **Tables**: Professional data display with hover effects
- **Tiles**: Beautiful content cards with multiple variants
- **Hero Sections**: Animated components with fade-in effects
- **Design System Showcase**: Complete component library at `/design-system`

### 🛠 Tech Stack

- **Frontend**: Next.js 15 with React 19, TypeScript
- **Styling**: Tailwind CSS 4 with custom design tokens
- **UI Components**: Radix UI primitives with custom styling
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand + TanStack Query
- **Authentication**: Supabase Auth with MFA support
- **Testing**: Vitest + Playwright + Testing Library
- **Monitoring**: Sentry for error tracking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Contributor prerequisites checklist

- [ ] Access to the shared Supabase project with the following secrets available locally and in CI: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for server tasks.
- [ ] Supabase CLI (optional but recommended) if you plan to inspect policies or run `supabase db` commands.
- [ ] Firebase project credentials with Cloud Messaging enabled (service account JSON for workers and web push key for the client).
- [ ] Redis instance URL (Upstash/Supabase/Redis Cloud) reserved for background queues – placeholder until the notification worker is implemented.
- [ ] Confirmed access to Loom design assets and Figma references used by the dashboard modules.
- [ ] Playwright browsers installed locally (`npx playwright install`) to execute the existing end-to-end suite.

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Tomerg91/Loom.git
   cd loom-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. **Open the application**
   - Main app: [http://localhost:3000](http://localhost:3000)
   - Design System: [http://localhost:3000/design-system](http://localhost:3000/design-system)

## 🎯 Key Pages

### Public Pages

- **`/`** - Landing page with hero section
- **`/design-system`** - Complete design system showcase
- **`/auth/signin`** - Modern sign in page
- **`/auth/signup`** - Professional registration flow
- **`/auth/reset-password`** - Password reset process

### Coach Dashboard

- **`/coach/dashboard`** - Main coach dashboard
- **`/coach/resources`** - Resource library management
- **`/coach/resources/collections`** - Collections management
- **`/coach/resources/analytics`** - Resource analytics dashboard

### Client Dashboard

- **`/client/dashboard`** - Main client dashboard
- **`/client/resources`** - Shared resources library

## 🧪 Testing & Development

### Design System Preview

- **Test Auth Pages**: Open `test-auth-pages.html` in your browser
- **Test Components**: Open `test-design-system.html` for component preview
- **Live Showcase**: Visit `/design-system` when running the dev server

### Scripts Available

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run test         # Run tests
npm run test:e2e     # Run Playwright tests
```

### Launch Preparation

- Review the [Launch Checklist](docs/launch/checklist.md) and assign owners before promoting a release candidate.
- Seed staging data with representative users and sessions via `npm run seed:staging` (requires Supabase service-role access and executes `scripts/seed/staging.mjs`).
- Align customer support on the [Support Playbook](docs/launch/support-playbook.md) and circulate known risks from [Known Issues](docs/launch/known-issues.md).

## 🎨 Design System

### Color Palette

- **Primary Orange**: `#ea580c` (Dark orange for buttons)
- **Orange**: `#f97316` (Standard orange)
- **Red**: `#ef4444` (Accent and destructive actions)
- **Black**: `#171717` (Secondary buttons and text)
- **Neutrals**: Gray scale from 50-950

### Typography

- **Font Family**: Inter (Google Fonts)
- **Weights**: Thin (100), Extralight (200), Light (300), Normal (400)
- **Approach**: Light fonts for professional, clean appearance

### Components

All components follow the design system principles:

- Clean white backgrounds
- Subtle shadows and borders
- Orange focus states
- Consistent spacing and typography
- Mobile-responsive design

## 🏗 Project Structure

```
src/
├── app/                     # Next.js 15 App Router
│   ├── [locale]/           # Internationalized routes
│   ├── api/                # API routes
│   └── design-system/      # Design system showcase
├── components/
│   ├── auth/               # Authentication components
│   ├── ui/                 # Base UI components
│   └── design-system/      # Design system demos
├── lib/                    # Utilities and configuration
├── styles/                 # Global styles
└── types/                  # TypeScript type definitions
```

## 📖 Documentation

Comprehensive guides for users and administrators:

- **[Features Guide](docs/FEATURES.md)** - Complete feature documentation
  - Resource Library user guide for coaches and clients
  - Authentication and security features
  - User roles and permissions
  - API usage examples and best practices

- **[Admin Guide](docs/ADMIN_GUIDE.md)** - Administration and operations
  - Database health monitoring
  - Security advisor tools and procedures
  - Supabase management and maintenance
  - Performance monitoring and optimization
  - Troubleshooting common issues

- **[Resource Library Technical Docs](docs/RESOURCE_LIBRARY.md)** - Developer reference
  - Database schema and architecture
  - API endpoints and usage
  - Component architecture
  - Security implementation details

- **[Launch Preparation](docs/launch/)** - Production readiness
  - [Launch Checklist](docs/launch/checklist.md)
  - [Support Playbook](docs/launch/support-playbook.md)
  - [Known Issues](docs/launch/known-issues.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please review the [Features Guide](docs/FEATURES.md) and [Admin Guide](docs/ADMIN_GUIDE.md) to understand the system architecture before contributing.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components powered by [Radix UI](https://www.radix-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database by [Supabase](https://supabase.com/)
- Icons from [Lucide React](https://lucide.dev/)

---

**Loom App** - Empowering coaches and clients with beautiful, professional tools. 🌟
