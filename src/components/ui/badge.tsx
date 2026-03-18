import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'env-dev' | 'env-staging' | 'env-prod' | 'env-test' | 'gold';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      success: 'bg-success/20 text-success border border-success/30',
      warning: 'bg-warning/20 text-warning border border-warning/30',
      danger: 'bg-danger/20 text-danger border border-danger/30',
      outline: 'border border-border text-foreground',
      'env-dev': 'bg-dev/15 text-dev border border-dev/25',
      'env-staging': 'bg-staging/15 text-staging border border-staging/25',
      'env-prod': 'bg-prod/15 text-prod border border-prod/25',
      'env-test': 'bg-test/15 text-test border border-test/25',
      gold: 'bg-gold/15 text-gold border border-gold/25',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
