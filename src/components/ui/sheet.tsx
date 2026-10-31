'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * A bottom sheet on a phone, a centred dialog from `sm` up.
 *
 * The app opens most secondary content this way — Learn, the question count,
 * the PDF pickers, a word's detail — rather than navigating away, so the list
 * behind stays put. This is that behaviour, in web form.
 *
 * Built on the native `<dialog>` element, which already does the hard parts
 * correctly: focus moves in on open and returns to the trigger on close, focus
 * is trapped while it is open, Escape closes it, and `::backdrop` gives a real
 * scrim that the rest of the page cannot be clicked through. Re-implementing
 * any of that by hand is how dialogs end up inaccessible.
 *
 * What is added on top: scroll lock on the page behind, a click-outside close,
 * and a drag-down close on touch, because a sheet that cannot be swiped away
 * feels wrong on a phone.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Names the dialog for assistive technology. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const dragStart = useRef<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // The page behind a dialog must not scroll.
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }

    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  /* `cancel` fires for Escape, so closing stays in one place. */
  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose]
  );

  /*
   * A click on the dialog element itself — rather than on the panel inside it —
   * is a click on the backdrop.
   */
  function handleClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === ref.current) onClose();
  }

  function onTouchStart(event: React.TouchEvent) {
    // Only start a drag from the top of the sheet, so an inner scroll still works.
    const scroller = panel.current;
    if (scroller && scroller.scrollTop > 0) return;
    dragStart.current = event.touches[0]?.clientY ?? null;
  }

  function onTouchMove(event: React.TouchEvent) {
    if (dragStart.current === null) return;
    const delta = (event.touches[0]?.clientY ?? 0) - dragStart.current;
    if (delta > 90) {
      dragStart.current = null;
      onClose();
    }
  }

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={handleCancel}
      onClick={handleClick}
      className={cn(
        // The element is the full viewport so the backdrop fills it; the panel
        // inside is what the reader sees.
        'fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0',
        'backdrop:bg-scrim/50 backdrop:backdrop-blur-[2px]',
        'open:flex open:items-end open:justify-center sm:open:items-center'
      )}
    >
      <div
        ref={panel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        className={cn(
          'bg-surface-1 relative flex w-full flex-col',
          // A sheet never covers the whole screen: the list behind stays visible.
          'max-h-[85dvh] overflow-y-auto overscroll-contain',
          'rounded-t-[1.75rem] shadow-[var(--shadow-overlay)]',
          'sm:max-w-lg sm:rounded-[1.75rem]',
          'motion-safe:animate-[sheet-in_var(--duration-slow)_var(--ease-enter)]',
          className
        )}
      >
        {/* The grab handle. Decorative: dragging is a convenience, and Escape,
            the backdrop and the close button all do the same job. */}
        <div aria-hidden="true" className="flex justify-center pt-3 pb-1 sm:hidden">
          <span className="bg-outline-variant h-1.5 w-10 rounded-full" />
        </div>

        {children}
      </div>
    </dialog>
  );
}
