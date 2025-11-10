'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface NavigationLink {
  label: string;
  href: string;
}

interface PrimaryAction {
  label: string;
  href: string;
}

export interface MarketingHeaderContent {
  links: NavigationLink[];
  contact: PrimaryAction;
  signIn: PrimaryAction;
  signUp: PrimaryAction;
  logoLabel: string;
  navigationAriaLabel: string;
  openMenuLabel: string;
  closeMenuLabel: string;
}

interface MarketingHeaderProps {
  locale: string;
  content: MarketingHeaderContent;
}

export function MarketingHeader({ locale, content }: MarketingHeaderProps) {
  const [open, setOpen] = useState(false);

  const toggleMenu = () => setOpen((prev) => !prev);
  const closeMenu = () => setOpen(false);
  const resolveLocale = (href: string) => (href.startsWith('/') ? locale : undefined);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            locale={locale}
            className="group flex items-center gap-2 text-slate-900"
            aria-label={content.logoLabel}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-6 w-6"
              >
                <path
                  fill="currentColor"
                  d="M12 2.5c-4.14 0-7.5 3.36-7.5 7.5 0 3.03 1.82 5.65 4.45 6.84L9 21.5l3-2 3 2-.05-4.66c2.63-1.19 4.55-3.81 4.55-6.84 0-4.14-3.36-7.5-7.5-7.5Zm0 2c3.03 0 5.5 2.47 5.5 5.5 0 2.26-1.34 4.23-3.34 5.09l-.66.28.04 3.13-1.54-1.02-1.46 1.02.04-3.13-.66-.28C7.84 14.23 6.5 12.26 6.5 10c0-3.03 2.47-5.5 5.5-5.5Z"
                />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight transition-colors group-hover:text-purple-600">
              Loom-app
            </span>
          </Link>
        </div>

        <nav
          id="main-navigation"
          className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex"
          aria-label={content.navigationAriaLabel}
        >
          {content.links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href as unknown}
              locale={resolveLocale(link.href)}
              className="transition-colors hover:text-purple-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher variant="dropdown" size="sm" className="hidden lg:flex" />
          <Button variant="ghost" size="sm" asChild>
            <Link href={content.contact.href as unknown} locale={resolveLocale(content.contact.href)}>
              {content.contact.label}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={content.signIn.href as unknown} locale={resolveLocale(content.signIn.href)}>
              {content.signIn.label}
            </Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link href={content.signUp.href as unknown} locale={resolveLocale(content.signUp.href)}>
              {content.signUp.label}
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher variant="button" size="sm" />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMenu}
            className="px-2"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? content.closeMenuLabel : content.openMenuLabel}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          'md:hidden border-t border-slate-200 bg-white transition-[max-height] duration-300 ease-in-out overflow-hidden',
          open ? 'max-h-[520px]' : 'max-h-0'
        )}
      >
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-col space-y-2 text-base font-medium text-slate-700">
            {content.links.map((link) => (
              <Link
                key={`mobile-${link.href}-${link.label}`}
                href={link.href as unknown}
                locale={resolveLocale(link.href)}
                className="rounded-lg px-3 py-2 transition-colors hover:bg-purple-50 hover:text-purple-700"
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="ghost" className="justify-center" asChild>
              <Link
                href={content.contact.href as unknown}
                locale={resolveLocale(content.contact.href)}
                onClick={closeMenu}
              >
                {content.contact.label}
              </Link>
            </Button>
            <Button variant="outline" className="justify-center" asChild>
              <Link
                href={content.signIn.href as unknown}
                locale={resolveLocale(content.signIn.href)}
                onClick={closeMenu}
              >
                {content.signIn.label}
              </Link>
            </Button>
            <Button variant="default" className="justify-center" asChild>
              <Link
                href={content.signUp.href as unknown}
                locale={resolveLocale(content.signUp.href)}
                onClick={closeMenu}
              >
                {content.signUp.label}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
