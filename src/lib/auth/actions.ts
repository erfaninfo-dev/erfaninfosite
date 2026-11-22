'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { isLocale } from '@/lib/i18n/config';
import { toAsciiDigits } from '@/lib/i18n/format';

import { apiErrorText, parseToken, type AuthFormState } from './account';
import { authRequest } from './api';
import { clearAuthToken, getAuthToken, setAuthToken } from './session';

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function returnPath(locale: string, next: string): Route {
  const fallback = (isLocale(locale) ? `/${locale}` : '/en') as Route;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || next.includes('://')) {
    return fallback;
  }
  if (!/^\/(en|fa|ckb)(\/[^?#]*)?(\?[^#]*)?$/.test(next)) return fallback;
  return next as Route;
}

function emailProblem(email: string): AuthFormState | null {
  if (!email) return { error: 'email' };
  if (!email.includes('@') || /\s/.test(email) || email.length > 200) return { error: 'email-invalid' };
  return null;
}

export async function loginAction(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = field(formData, 'locale');
  const email = field(formData, 'email');
  const password = field(formData, 'password');
  const problem = emailProblem(email);
  if (problem) return problem;
  if (password.length < 8 || password.length > 200) return { error: 'short' };

  const result = await authRequest('login.php', {
    method: 'POST',
    body: { email, password },
    timeoutMs: 45_000,
  });
  const token = result.status === 200 ? parseToken(result.json) : null;
  if (!token) {
    const message = apiErrorText(result.json).toLowerCase();
    if (result.status === 401 || message.includes('invalid email') || message.includes('password')) {
      return { error: 'invalid' };
    }
    return { error: 'failed' };
  }

  await setAuthToken(token);
  redirect(returnPath(locale, field(formData, 'next')));
}

export async function registerAction(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = field(formData, 'locale');
  const email = field(formData, 'email');
  const password = field(formData, 'password');
  const confirm = field(formData, 'confirm');
  const displayName = field(formData, 'display_name').slice(0, 80);
  const asStudent = formData.get('as_student') === '1';
  const code = toAsciiDigits(field(formData, 'student_code')).replace(/\D+/g, '');

  const problem = emailProblem(email);
  if (problem) return problem;
  if (password.length < 8 || password.length > 200) return { error: 'short' };
  if (!confirm) return { error: 'confirm' };
  if (confirm !== password) return { error: 'match' };
  if (asStudent && !code) return { error: 'required' };
  if (asStudent && !/^\d{5}$/.test(code)) return { error: 'code' };

  const body: Record<string, unknown> = { email, password };
  if (displayName) body.display_name = displayName;
  if (asStudent) {
    body.is_student = true;
    body.student_code = code;
  }

  const result = await authRequest('register.php', {
    method: 'POST',
    body,
    timeoutMs: 45_000,
  });
  // wordsapi answers a new account with 201 Created and a token, not 200.
  const token =
    result.status === 200 || result.status === 201 ? parseToken(result.json) : null;
  if (!token) {
    const message = apiErrorText(result.json).toLowerCase();
    if (
      result.status === 409 ||
      message.includes('taken') ||
      message.includes('already') ||
      message.includes('registered') ||
      message.includes('exists')
    ) {
      return { error: 'taken' };
    }
    return { error: 'failed' };
  }

  await setAuthToken(token);
  redirect(returnPath(locale, isLocale(locale) ? `/${locale}/membership` : '/en'));
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = field(formData, 'locale');
  const token = await getAuthToken();
  if (token) {
    await authRequest('logout.php', { method: 'POST', token });
  }
  await clearAuthToken();
  redirect(returnPath(locale, ''));
}

export async function redeemStudentCodeAction(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = field(formData, 'locale');
  const code = toAsciiDigits(field(formData, 'code')).replace(/\D+/g, '');
  if (!code) return { error: 'required' };
  if (!/^\d{5}$/.test(code)) return { error: 'code' };

  const token = await getAuthToken();
  if (!token) return { error: 'invalid' };

  const result = await authRequest('student_redeem_code.php', {
    method: 'POST',
    token,
    body: { code },
  });
  const ok =
    result.status === 200 &&
    !!result.json &&
    typeof result.json === 'object' &&
    (result.json as { ok?: unknown }).ok === true;
  if (!ok) {
    if (result.status >= 500 || result.status === 0) return { error: 'failed' };
    return { error: 'code' };
  }

  const next = field(formData, 'next');
  const fallback = isLocale(locale) ? `/${locale}/you?granted=1` : '/en/you?granted=1';
  redirect(returnPath(locale, next || fallback));
}

export type ResetCodeResult = 'ok' | 'invalid' | 'failed';
export type ResetConfirmResult = 'ok' | 'invalid' | 'code' | 'short' | 'match' | 'rejected' | 'failed';

/** Same address the app copies from the forgot-password sheet. */
export async function sendResetCode(email: string): Promise<ResetCodeResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@') || /\s/.test(trimmed) || trimmed.length > 200) {
    return 'invalid';
  }
  const result = await authRequest('password_reset_request.php', {
    method: 'POST',
    body: { email: trimmed },
    timeoutMs: 45_000,
  });
  return result.status === 200 ? 'ok' : 'failed';
}

export async function confirmReset(input: {
  email: string;
  code: string;
  password: string;
  confirm: string;
}): Promise<ResetConfirmResult> {
  const email = input.email.trim().toLowerCase();
  const code = toAsciiDigits(input.code).replace(/\D+/g, '');
  if (!email || !email.includes('@') || /\s/.test(email)) return 'invalid';
  if (code.length !== 6) return 'code';
  if (input.password.length < 8 || input.password.length > 200) return 'short';
  if (input.password !== input.confirm) return 'match';

  const result = await authRequest('password_reset_confirm.php', {
    method: 'POST',
    body: { email, code, new_password: input.password },
    timeoutMs: 45_000,
  });
  const ok =
    result.status === 200 &&
    !!result.json &&
    typeof result.json === 'object' &&
    (result.json as { ok?: unknown }).ok === true;
  if (ok) return 'ok';
  if (apiErrorText(result.json).toLowerCase().includes('invalid code')) return 'rejected';
  return 'failed';
}
