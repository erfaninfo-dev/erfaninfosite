'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useState } from 'react';
import Link from 'next/link';

import type { AuthFormState } from '@/lib/auth/account';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

import { ForgotPasswordSheet, type ResetLabels } from './forgot-password-sheet';

const FIELD =
  'bg-surface-3 text-on-surface placeholder:text-on-surface-variant h-12 w-full rounded-[var(--radius-input)] border-0 px-4';

type Labels = {
  email: string;
  password: string;
  displayName: string;
  confirm: string;
  registerAsStudent: string;
  studentCode: string;
  studentCodeHint: string;
  submit: string;
  switchLabel: string;
  enterEmail: string;
  enterValidEmail: string;
  passwordMinLength: string;
  confirmYourPassword: string;
  passwordsNoMatch: string;
  studentCodeRequired: string;
  studentCodeInvalid: string;
  invalid: string;
  taken: string;
  failed: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary text-on-primary mt-2 min-h-12 w-full rounded-full font-extrabold disabled:opacity-70"
    >
      {label}
    </button>
  );
}

export function AuthForm({
  mode,
  action,
  locale,
  nextPath,
  switchHref,
  labels,
  reset,
}: {
  mode: 'login' | 'register';
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  locale: Locale;
  nextPath: string;
  switchHref: string;
  labels: Labels;
  reset?: ResetLabels;
}) {
  const [state, formAction] = useActionState(action, {});
  const [asStudent, setAsStudent] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const message =
    state.error === 'email'
      ? labels.enterEmail
      : state.error === 'email-invalid'
        ? labels.enterValidEmail
        : state.error === 'short'
          ? labels.passwordMinLength
          : state.error === 'confirm'
            ? labels.confirmYourPassword
            : state.error === 'match'
              ? labels.passwordsNoMatch
              : state.error === 'required'
                ? labels.studentCodeRequired
                : state.error === 'code'
                  ? labels.studentCodeInvalid
                  : state.error === 'invalid'
                    ? labels.invalid
                    : state.error === 'taken'
                      ? labels.taken
                      : state.error === 'failed'
                        ? labels.failed
                        : '';

  return (
    <>
    <form action={formAction} className="flex flex-col gap-3" noValidate onReset={() => setAsStudent(false)}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={nextPath} />

      {mode === 'register' ? (
        <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
          {labels.displayName}
          <input name="display_name" autoComplete="nickname" maxLength={80} className={FIELD} />
        </label>
      ) : null}

      <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
        {labels.email}
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={200}
          className={FIELD}
        />
      </label>

      <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
        {labels.password}
        <input
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          maxLength={200}
          className={FIELD}
        />
      </label>

      {mode === 'login' && reset ? (
        <button
          type="button"
          className="text-primary self-end min-h-11 font-bold"
          onClick={(event) => {
            const form = event.currentTarget.form;
            const email = form ? String(new FormData(form).get('email') ?? '') : '';
            setResetDone(false);
            setResetEmail(email);
          }}
        >
          {reset.forgot}
        </button>
      ) : null}

      {mode === 'register' ? (
        <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
          {labels.confirm}
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            className={FIELD}
          />
        </label>
      ) : null}

      {mode === 'register' ? (
        <label className="text-on-surface flex min-h-11 items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            name="as_student"
            value="1"
            checked={asStudent}
            onChange={(event) => setAsStudent(event.target.checked)}
            className="size-4"
          />
          {labels.registerAsStudent}
        </label>
      ) : null}

      {mode === 'register' && asStudent ? (
        <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
          {labels.studentCode}
          <input
            name="student_code"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            placeholder={labels.studentCodeHint}
            className={FIELD}
          />
        </label>
      ) : null}

      {resetDone && reset ? (
        <p role="status" className="text-primary text-sm font-bold">
          {reset.success}
        </p>
      ) : null}

      {message ? (
        <p role="alert" className="text-error text-sm font-bold">
          {message}
        </p>
      ) : null}

      <SubmitButton label={labels.submit} />

      <Link href={localeHref(locale, switchHref)} className="text-primary min-h-11 text-center font-bold">
        {labels.switchLabel}
      </Link>
    </form>
    {reset && resetEmail !== null ? (
      <ForgotPasswordSheet
        initialEmail={resetEmail}
        labels={reset}
        onClose={() => setResetEmail(null)}
        onChanged={() => setResetDone(true)}
      />
    ) : null}
    </>
  );
}
