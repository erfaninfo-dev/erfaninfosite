'use server';

import { revalidatePath } from 'next/cache';

import { authRequest } from './api';
import { getAuthToken } from './session';

export type PanelActionState = { ok?: boolean; error?: 'auth' | 'failed' | 'rejected' };

export async function adminUpdateUserAction(
  _state: PanelActionState,
  formData: FormData
): Promise<PanelActionState> {
  const token = await getAuthToken();
  if (!token) return { error: 'auth' };

  const userId = Number(formData.get('user_id'));
  if (!Number.isFinite(userId) || userId < 1) return { error: 'rejected' };

  const body: Record<string, unknown> = { user_id: userId };
  const sa = formData.get('student_access');
  if (sa === '1' || sa === '0') body.student_access = sa === '1';
  const it = formData.get('is_teacher');
  if (it === '1' || it === '0') body.is_teacher = it === '1';
  const tid = formData.get('teacher_user_id');
  if (tid === 'none') body.teacher_user_id = null;
  else if (typeof tid === 'string' && /^\d+$/.test(tid)) body.teacher_user_id = Number(tid);

  if (
    !('student_access' in body) &&
    !('is_teacher' in body) &&
    !('teacher_user_id' in body)
  ) {
    return { error: 'rejected' };
  }

  const result = await authRequest('admin_user_student.php', {
    token,
    method: 'POST',
    body,
  });
  if (result.status === 401 || result.status === 403) return { error: 'auth' };
  if (result.status !== 200) return { error: 'failed' };

  revalidatePath('/[locale]/admin/users', 'page');
  return { ok: true };
}

export type CodeActionState = PanelActionState & { code?: string };

export async function createStudentCodeAction(
  _state: CodeActionState,
  _formData: FormData
): Promise<CodeActionState> {
  const token = await getAuthToken();
  if (!token) return { error: 'auth' };

  const code = String(Math.floor(10000 + Math.random() * 90000));

  const result = await authRequest('teacher_student_codes.php', {
    token,
    method: 'POST',
    body: { code },
  });
  if (result.status === 401 || result.status === 403) return { error: 'auth' };
  if (result.status !== 200 && result.status !== 201) return { error: 'failed' };
  const json = result.json as Record<string, unknown> | null;
  const registered = typeof json?.code === 'string' ? json.code : code;
  return { ok: true, code: registered };
}
