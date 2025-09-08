import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  // In Tailwind CSS v4, the content array is no longer needed as file scanning is automatic
  // Dark mode is now configured through CSS classes and CSS variables
  darkMode: 'class',
  
  // Enable RTL support
  future: {
    hoverOnlyWhenSupported: true,
  },
  
  theme: {
    // Container configuration for responsive design
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    
    // Extended theme configuration
    extend: {
      colors: {
        // Design system colors using CSS variables for light/dark mode support
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Premium color palette for luxury aesthetics
        platinum: {
          50: '#fdfdf9',
          100: '#fafaf2',
          200: '#f4f4e5',
          300: '#eeecd1',
          400: '#e3dfb4',
          500: '#d6d08f',
          600: '#c5bd70',
          700: '#aca159',
          800: '#8e8348',
          900: '#746b3b',
          950: '#3e3a1f',
        },
        champagne: {
          50: '#fefdfb',
          100: '#fdf9f4',
          200: '#f9f1e3',
          300: '#f3e5c8',
          400: '#ebd4a0',
          500: '#ddbf73',
          600: '#cca652',
          700: '#b08c42',
          800: '#8f7038',
          900: '#745b30',
          950: '#3f2f17',
        },
        obsidian: {
          50: '#f6f7f9',
          100: '#ebeef2',
          200: '#d2dae3',
          300: '#aabccc',
          400: '#7b97b0',
          500: '#5a7a96',
          600: '#46607d',
          700: '#394e66',
          800: '#314255',
          900: '#2c3a48',
          950: '#1a232e',
        },
        pearl: {
          50: '#fdfdf9',
          100: '#fbfbf6',
          200: '#f5f5eb',
          300: '#eeecd9',
          400: '#e1ddb6',
          500: '#d0c98f',
          600: '#bfb170',
          700: '#a8954d',
          800: '#8a7940',
          900: '#706235',
          950: '#3d331b',
        },
        
        // Custom coaching platform color schemes
        coach: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        client: {
          50: '#fef7ff',
          100: '#fceeff',
          200: '#f8d4fe',
          300: '#f3b1fd',
          400: '#ea7cfa',
          500: '#dc56f5',
          600: '#c236e8',
          700: '#a21ccd',
          800: '#851aa6',
          900: '#6e1b85',
          950: '#4a0d5c',
        },
        session: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#0f2027',
        },
      },
      
      // Border radius using CSS variables
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      
      // Font family configuration
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      
      // Extended font sizes
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      
      // Custom spacing values
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // RTL-specific utilities
      direction: {
        'ltr': 'ltr',
        'rtl': 'rtl',
      },
      
      // Animation configuration
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'bounce-subtle': 'bounce-subtle 2s infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      // Keyframes for animations
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      
      // Premium box shadows
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        'luxury': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'gold': '0 10px 40px -10px rgba(221, 191, 115, 0.3), 0 0 0 1px rgba(221, 191, 115, 0.1)',
        'obsidian': '0 25px 50px -12px rgba(26, 35, 46, 0.25), 0 0 0 1px rgba(26, 35, 46, 0.05)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'floating': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },

      // Premium gradients
      backgroundImage: {
        'gradient-luxury': 'linear-gradient(135deg, #ddbf73 0%, #aca159 50%, #746b3b 100%)',
        'gradient-obsidian': 'linear-gradient(135deg, #1a232e 0%, #2c3a48 50%, #46607d 100%)',
        'gradient-pearl': 'linear-gradient(135deg, #fdfdf9 0%, #d0c98f 50%, #a8954d 100%)',
        'gradient-platinum': 'linear-gradient(135deg, #fdfdf9 0%, #d6d08f 50%, #aca159 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'noise': `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      },
    },
  },
  
  // Plugins using ES module import
  plugins: [tailwindcssAnimate],
};

export default config;