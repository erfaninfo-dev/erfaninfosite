import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:brightness-110 active:brightness-95 disabled:bg-surface-5 disabled:text-on-surface-variant',
  secondary:
    'bg-secondary-container text-on-secondary-container hover:brightness-105 active:brightness-95 disabled:bg-surface-5 disabled:text-on-surface-variant',
  ghost:
    'bg-transparent text-primary border border-outline-strong hover:bg-surface-3 active:bg-surface-4 disabled:text-on-surface-variant',
  destructive:
    'bg-error text-on-error hover:brightness-110 active:brightness-95 disabled:bg-surface-5 disabled:text-on-surface-variant',
};

const SIZES: Record<Size, string> = {
  // Both exceed the 44px minimum touch target.
  md: 'min-h-[var(--size-button-md)] px-4 py-3.5 text-[length:var(--text-label)]',
  lg: 'min-h-[var(--size-button-lg)] px-4 py-3.5 text-[length:var(--text-body)]',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-bold ' +
  'transition-[filter,background-color] duration-[var(--duration-fast)] ease-[var(--ease-enter)] ' +
  'disabled:cursor-not-allowed select-none text-center';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
};

export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: CommonProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children'> & {
    loading?: boolean;
  }) {
  return (
    <button
      {...rest}
      // A loading button is busy, not broken: it announces itself rather than
      // just going flat and unexplained.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className,
  children,
  ...rest
}: CommonProps & Omit<ComponentPropsWithoutRef<typeof Link>, 'className' | 'children'>) {
  return (
    <Link
      {...rest}
      href={href}
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}
