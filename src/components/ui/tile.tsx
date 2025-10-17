import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const tileVariants = cva(
  'rounded-xl border transition-all duration-200 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-white border-neutral-300 hover:border-orange-500 hover:shadow-md',
        elevated: 'bg-white border-neutral-300 shadow-md hover:shadow-lg hover:border-orange-500 hover:-translate-y-1',
        outlined: 'bg-white border-2 border-neutral-300 hover:border-orange-500',
        ghost: 'bg-transparent border-transparent hover:bg-neutral-50',
        orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-400',
        red: 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-400',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      clickable: {
        true: 'cursor-pointer',
        false: 'cursor-default',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      clickable: true,
    },
  }
)

export interface TileProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tileVariants> {
  asChild?: boolean
  icon?: React.ReactNode
  title?: string
  description?: string
  badge?: React.ReactNode
  action?: React.ReactNode
}

const Tile = React.forwardRef<HTMLDivElement, TileProps>(
  ({
    className,
    variant,
    size,
    clickable,
    asChild = false,
    icon,
    title,
    description,
    badge,
    action,
    children,
    ...props
  }, ref) => {
    const Component = asChild ? React.Fragment : 'div'

    const content = children || (
      <div className="flex flex-col space-y-3">
        {(icon || badge) && (
          <div className="flex items-center justify-between">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            {badge && (
              <div className="flex-shrink-0">
                {badge}
              </div>
            )}
          </div>
        )}
        
        {title && (
          <h3 className="text-lg font-light text-neutral-900 leading-tight">
            {title}
          </h3>
        )}
        
        {description && (
          <p className="text-sm font-light text-neutral-600 leading-relaxed">
            {description}
          </p>
        )}
        
        {action && (
          <div className="pt-2">
            {action}
          </div>
        )}
      </div>
    )

    if (asChild) {
      return <>{content}</>
    }

    return (
      <div
        className={cn(tileVariants({ variant, size, clickable, className }))}
        ref={ref}
        {...props}
      >
        {content}
      </div>
    )
  }
)

Tile.displayName = 'Tile'

export { Tile, tileVariants }