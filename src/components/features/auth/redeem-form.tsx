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

export function RedeemForm({
  locale,
  labels,
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
  };
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
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <h2 className="text-on-surface text-base font-extrabold">{labels.title}</h2>
      <p className="text-on-surface-variant text-sm">{labels.subtitle}</p>
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
  );
}
