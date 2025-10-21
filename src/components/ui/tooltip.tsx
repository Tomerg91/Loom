'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="relative inline-block">{children}</div>;
};

const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
    children: React.ReactNode;
  }
>(({ className, asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ref,
      className: cn(className, child.props.className),
      ...props,
    });
  }
  
  return (
    <div
      ref={ref}
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </div>
  );
});

TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
  }
>(({ className, children, side = 'top', align = 'center', ...props }, ref) => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    const trigger = ref && 'current' in ref ? ref.current?.previousElementSibling : null;
    if (!trigger) return;
    
    const showTooltip = () => setIsVisible(true);
    const hideTooltip = () => setIsVisible(false);
    
    trigger.addEventListener('mouseenter', showTooltip);
    trigger.addEventListener('mouseleave', hideTooltip);
    trigger.addEventListener('focus', showTooltip);
    trigger.addEventListener('blur', hideTooltip);
    
    return () => {
      trigger.removeEventListener('mouseenter', showTooltip);
      trigger.removeEventListener('mouseleave', hideTooltip);
      trigger.removeEventListener('focus', showTooltip);
      trigger.removeEventListener('blur', hideTooltip);
    };
  }, [ref]);
  
  if (!isVisible) return null;
  
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none',
        'animate-in fade-in-0 zoom-in-95',
        {
          'bottom-full left-1/2 transform -translate-x-1/2 mb-1': side === 'top',
          'top-full left-1/2 transform -translate-x-1/2 mt-1': side === 'bottom',
          'right-full top-1/2 transform -translate-y-1/2 mr-1': side === 'left',
          'left-full top-1/2 transform -translate-y-1/2 ml-1': side === 'right',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

TooltipContent.displayName = 'TooltipContent';

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };