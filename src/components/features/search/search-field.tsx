import { IconSearch } from '@/components/ui/icons';

/**
 * The site search field.
 *
 * A plain GET form, so it works without JavaScript and puts the query in the
 * URL — which is what makes a search shareable and restorable, as the spec
 * requires. No client component is needed for that.
 */
export function SearchField({
  action,
  defaultValue,
  placeholder,
  label,
}: {
  action: string;
  defaultValue: string;
  placeholder: string;
  label: string;
}) {
  return (
    <form action={action} method="get" role="search" className="relative">
      <IconSearch className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-on-surface-variant" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className="h-12 w-full rounded-[var(--radius-input)] border-0 bg-surface-3 ps-11 pe-4 text-[length:var(--text-body)] text-on-surface placeholder:text-on-surface-variant"
      />
    </form>
  );
}
