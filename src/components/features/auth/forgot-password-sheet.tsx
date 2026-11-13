'use client';

import { useEffect, useId, useState } from 'react';

import { confirmReset, sendResetCode } from '@/lib/auth/actions';
import { toAsciiDigits } from '@/lib/i18n/format';

/** The app's `kPasswordResetSupportLaunchUri`. */
const SUPPORT_LINK = 'https://rubika.ir';

const FIELD =
  'bg-surface-3 text-on-surface placeholder:text-on-surface-variant h-12 w-full rounded-[var(--radius-input)] border-0 px-4 text-left';

export type ResetLabels = {
  forgot: string;
  title: string;
  email: string;
  send: string;
  helper: string;
  sent: string;
  sendFailed: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
  change: string;
  invalidEmail: string;
  invalidCode: string;
  short: string;
  mismatch: string;
  changeFailed: string;
  success: string;
  copySupport: string;
  copied: string;
  close: string;
};

export function ForgotPasswordSheet({
  initialEmail,
  labels,
  onClose,
  onChanged,
}: {
  initialEmail: string;
  labels: ResetLabels;
  onClose: () => void;
  onChanged: () => void;
}) {
  const titleId = useId();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<'send' | 'confirm' | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeError, setNoticeError] = useState(false);
  const [copied, setCopied] = useState(false);

  function show(message: string, error: boolean) {
    setCopied(false);
    setNoticeError(error);
    setNotice(message);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function send() {
    setBusy('send');
    const result = await sendResetCode(email);
    setBusy(null);
    if (result === 'invalid') {
      show(labels.invalidEmail, true);
      return;
    }
    if (result === 'failed') {
      show(labels.sendFailed, true);
      return;
    }
    setSent(true);
    show(labels.sent, false);
  }

  async function change() {
    setBusy('confirm');
    const result = await confirmReset({ email, code, password, confirm });
    setBusy(null);
    if (result === 'ok') {
      onChanged();
      onClose();
      return;
    }
    show(
      result === 'invalid'
        ? labels.invalidEmail
        : result === 'code' || result === 'rejected'
          ? labels.invalidCode
          : result === 'short'
            ? labels.short
            : result === 'match'
              ? labels.mismatch
              : labels.changeFailed,
      true
    );
  }

  async function copySupport() {
    try {
      await navigator.clipboard.writeText(SUPPORT_LINK);
      setNotice('');
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={labels.close}
        className="absolute inset-0 bg-on-surface/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-surface-1 relative max-h-[90vh] w-full overflow-y-auto rounded-t-[var(--radius-card)] px-6 pt-6 pb-8 sm:max-w-md sm:rounded-[var(--radius-card)]"
      >
        <h2 id={titleId} className="text-on-surface text-lg font-extrabold">
          {labels.title}
        </h2>
        <label className="text-on-surface mt-4 flex flex-col gap-1 text-sm font-bold">
          {labels.email}
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            dir="ltr"
            className={FIELD}
          />
        </label>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void send()}
          className="bg-primary text-on-primary mt-3 min-h-12 w-full rounded-full font-extrabold disabled:opacity-70"
        >
          {labels.send}
        </button>
        {sent ? (
          <div className="mt-3 flex flex-col gap-3">
            <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
              {labels.code}
              <input
                value={code}
                onChange={(event) =>
                  setCode(toAsciiDigits(event.target.value).replace(/\D+/g, '').slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                dir="ltr"
                className={FIELD}
              />
            </label>
            <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
              {labels.newPassword}
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                maxLength={200}
                dir="ltr"
                className={FIELD}
              />
            </label>
            <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
              {labels.confirmPassword}
              <input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                type="password"
                autoComplete="new-password"
                maxLength={200}
                dir="ltr"
                className={FIELD}
              />
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void change()}
              className="bg-primary text-on-primary min-h-12 w-full rounded-full font-extrabold disabled:opacity-70"
            >
              {labels.change}
            </button>
          </div>
        ) : (
          <p className="text-on-surface-variant mt-3 text-sm">{labels.helper}</p>
        )}
        {notice ? (
          <p role="alert" className={noticeError ? 'text-error mt-3 text-sm font-bold' : 'text-primary mt-3 text-sm font-bold'}>
            {notice}
          </p>
        ) : null}
        {copied ? (
          <p role="status" className="text-primary mt-3 text-sm font-bold">
            {labels.copied}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void copySupport()}
          className="text-primary mt-2 min-h-11 w-full font-bold"
        >
          {labels.copySupport}
        </button>
        <button type="button" onClick={onClose} className="text-on-surface-variant min-h-11 w-full font-bold">
          {labels.close}
        </button>
      </div>
    </div>
  );
}
