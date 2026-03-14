import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary' | 'primary-outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      default: 'bg-[var(--color-primary)] text-[var(--color-surface)] hover:opacity-90',
      destructive: 'bg-[var(--color-danger)] text-white hover:opacity-90',
      outline: 'border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)] hover:border-[var(--color-border-hover)]',
      secondary: 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:opacity-80',
      ghost: 'hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]',
      link: 'text-[var(--color-primary)] underline-offset-4 hover:underline',
      primary: 'bg-[var(--color-primary)] text-[var(--color-surface)] hover:opacity-90 font-semibold',
      'primary-outline': 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10',
    };

    const sizes = {
      default: 'h-8 px-3 py-1 text-xs',
      sm: 'h-7 rounded-md px-2.5 text-[10px]',
      lg: 'h-9 rounded-md px-4 text-xs',
      icon: 'h-8 w-8',
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
