'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { redeemStudentCodeAction } from '@/lib/auth/actions';
import type { AuthFormState } from '@/lib/auth/account';
import type { Locale } from '@/lib/i18n/config';

const FIELD =
  'bg-surface-3 text-on-surface placeholder:text-on-surface-variant h-12 w-full rounded-[var(--radius-input)] border-0 px-4';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary text-on-primary min-h-12 w-full rounded-full font-extrabold disabled:opacity-70"
    >
      {label}
    </button>
  );
}

export function RedeemStudentSheet({
  locale,
  labels,
  onClose,
}: {
  locale: Locale;
  labels: {
    title: string;
    subtitle: string;
    code: string;
    hint: string;
    submit: string;
    required: string;
    invalid: string;
    failed: string;
    close: string;
  };
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(redeemStudentCodeAction, {} as AuthFormState);
  const message =
    state.error === 'required'
      ? labels.required
      : state.error === 'code' || state.error === 'invalid'
        ? labels.invalid
        : state.error === 'failed'
          ? labels.failed
          : '';

  return (
    <div
      className="border-outline-variant/60 bg-surface-1 fixed inset-x-4 bottom-[calc(var(--size-bottom-nav)+1rem)] z-50 max-h-[min(32rem,85vh)] overflow-y-auto rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-soft)] sm:inset-x-auto sm:start-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 rtl:sm:translate-x-1/2"
      role="dialog"
      aria-modal="true"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-on-surface text-lg font-extrabold">{labels.title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-on-surface-variant min-h-10 rounded-full px-3 text-sm font-bold"
        >
          {labels.close}
        </button>
      </div>
      <p className="text-on-surface-variant mb-4 text-sm">{labels.subtitle}</p>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={`/${locale}/you?granted=1`} />
        <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
          {labels.code}
          <input
            name="code"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            placeholder={labels.hint}
            className={FIELD}
          />
        </label>
        {message ? (
          <p role="alert" className="text-error text-sm font-bold">
            {message}
          </p>
        ) : null}
        <SubmitButton label={labels.submit} />
      </form>
    </div>
  );
}
