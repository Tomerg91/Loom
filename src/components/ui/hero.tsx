'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  description?: string
  children?: React.ReactNode
  backgroundVariant?: 'default' | 'gradient' | 'minimal'
  titleSize?: 'sm' | 'md' | 'lg' | 'xl'
  animationDelay?: number
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  ({
    className,
    title,
    subtitle,
    description,
    children,
    backgroundVariant = 'default',
    titleSize = 'lg',
    animationDelay = 0,
    ...props
  }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, animationDelay)

      return () => clearTimeout(timer)
    }, [animationDelay])

    const backgroundClasses = {
      default: 'bg-white',
      gradient: 'bg-gradient-to-br from-orange-50 via-white to-red-50',
      minimal: 'bg-neutral-50',
    }

    const titleSizeClasses = {
      sm: 'text-3xl md:text-4xl lg:text-5xl',
      md: 'text-4xl md:text-5xl lg:text-6xl',
      lg: 'text-5xl md:text-6xl lg:text-7xl',
      xl: 'text-6xl md:text-7xl lg:text-8xl',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden py-20 md:py-32 lg:py-40',
          backgroundClasses[backgroundVariant],
          className
        )}
        {...props}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0,0,0)_1px,transparent_0)] bg-[length:20px_20px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Subtitle */}
            {subtitle && (
              <div
                className={cn(
                  'mb-6 opacity-0 transform translate-y-4 transition-all duration-700 ease-out',
                  isVisible && 'opacity-100 translate-y-0'
                )}
                style={{ transitionDelay: '200ms' }}
              >
                <span className="inline-flex items-center rounded-full bg-orange-100 px-4 py-2 text-sm font-light text-orange-800 ring-1 ring-orange-200">
                  {subtitle}
                </span>
              </div>
            )}

            {/* Main Title */}
            <h1
              className={cn(
                'font-extralight tracking-tight text-neutral-900 mb-8 opacity-0 transform translate-y-6 transition-all duration-800 ease-out',
                titleSizeClasses[titleSize],
                isVisible && 'opacity-100 translate-y-0'
              )}
              style={{ transitionDelay: '400ms' }}
            >
              {title}
            </h1>

            {/* Description */}
            {description && (
              <p
                className={cn(
                  'mx-auto max-w-2xl text-lg md:text-xl font-light leading-relaxed text-neutral-600 mb-10 opacity-0 transform translate-y-4 transition-all duration-700 ease-out',
                  isVisible && 'opacity-100 translate-y-0'
                )}
                style={{ transitionDelay: '600ms' }}
              >
                {description}
              </p>
            )}

            {/* Action buttons or content */}
            {children && (
              <div
                className={cn(
                  'flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 transform translate-y-4 transition-all duration-700 ease-out',
                  isVisible && 'opacity-100 translate-y-0'
                )}
                style={{ transitionDelay: '800ms' }}
              >
                {children}
              </div>
            )}
          </div>
        </div>

        {/* Decorative elements */}
        <div
          className={cn(
            'absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full opacity-20 blur-3xl transition-all duration-1000 ease-out',
            isVisible && 'opacity-30 scale-110'
          )}
          style={{ transitionDelay: '1000ms' }}
        />
        <div
          className={cn(
            'absolute -bottom-40 -left-40 w-80 h-80 bg-red-200 rounded-full opacity-20 blur-3xl transition-all duration-1000 ease-out',
            isVisible && 'opacity-30 scale-110'
          )}
          style={{ transitionDelay: '1200ms' }}
        />
      </div>
    )
  }
)

Hero.displayName = 'Hero'

export { Hero }