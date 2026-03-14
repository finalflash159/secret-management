import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'env-dev' | 'env-staging' | 'env-prod';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--color-primary)] text-[var(--color-surface)]',
      secondary: 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
      success: 'bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30',
      warning: 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30',
      danger: 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border border-[var(--color-danger)]/30',
      outline: 'border border-[var(--color-border)] text-[var(--color-foreground)]',
      'env-dev': 'bg-[var(--color-dev)]/20 text-[var(--color-dev)] border border-[var(--color-dev)]/30',
      'env-staging': 'bg-[var(--color-staging)]/20 text-[var(--color-staging)] border border-[var(--color-staging)]/30',
      'env-prod': 'bg-[var(--color-prod)]/20 text-[var(--color-prod)] border border-[var(--color-prod)]/30',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
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
