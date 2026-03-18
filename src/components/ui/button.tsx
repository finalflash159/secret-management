import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'gold' | 'outline' | 'danger';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md',
      'text-sm font-semibold transition-all duration-120',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:pointer-events-none disabled:opacity-50',
      'btn-transition'
    );

    const variants = {
      // Primary button - dark background, light text
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      // Ghost - transparent with visible icon/text
      ghost: 'bg-transparent text-foreground hover:bg-muted border border-transparent',
      // Gold - accent button for special actions
      gold: 'bg-gold text-foreground hover:bg-gold/90',
      // Outline - transparent with border
      outline: 'bg-transparent border border-border text-foreground hover:bg-muted hover:border-border-hover',
      // Danger - red for destructive actions
      danger: 'bg-danger text-white hover:bg-danger/90',
    };

    const sizes = {
      default: 'h-9 px-4 py-2 text-sm',
      sm: 'h-8 px-3 py-1.5 text-xs',
      lg: 'h-10 px-5 py-2.5 text-base',
      icon: 'h-9 w-9',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
