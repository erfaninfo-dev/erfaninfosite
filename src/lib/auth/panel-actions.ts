'use server';

import { revalidatePath } from 'next/cache';

import { buildUrl } from '@/lib/api/client';
import { parseAccount, type Account } from './account';
import { authRequest } from './api';
import type { VocabQuizDetailItem, VocabQuizResultDetail } from './panel-types';
import { getAuthToken } from './session';
import { fetchChatThread, type ChatThread } from './you-fetch';

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

type ChatTarget = { studentId?: number | null; peerTeacherId?: number | null };

export async function pollChatThreadAction(
  target: ChatTarget
): Promise<{ ok: boolean; thread?: ChatThread }> {
  const token = await getAuthToken();
  if (!token) return { ok: false };
  const thread = await fetchChatThread(token, target);
  if (thread === 'forbidden' || thread === 'failed') return { ok: false };
  return { ok: true, thread };
}

export async function markChatReadAction(target: ChatTarget): Promise<{ ok: boolean }> {
  const token = await getAuthToken();
  if (!token) return { ok: false };
  const body: Record<string, unknown> = { action: 'mark_read' };
  if (target.studentId && target.studentId > 0) body.student_id = target.studentId;
  if (target.peerTeacherId && target.peerTeacherId > 0) body.peer_teacher_id = target.peerTeacherId;
  const res = await authRequest('teacher_student_messages.php', {
    token,
    method: 'POST',
    body,
  });
  return { ok: res.status === 200 };
}

export async function sendChatMessageAction(
  input: ChatTarget & { body: string }
): Promise<{ ok: boolean; thread?: ChatThread }> {
  const token = await getAuthToken();
  if (!token) return { ok: false };
  const trimmed = input.body.trim();
  if (!trimmed) return { ok: false };
  const body: Record<string, unknown> = { body: trimmed };
  if (input.studentId && input.studentId > 0) body.student_id = input.studentId;
  if (input.peerTeacherId && input.peerTeacherId > 0) body.peer_teacher_id = input.peerTeacherId;

  const res = await authRequest('teacher_student_messages.php', {
    token,
    method: 'POST',
    body,
  });
  if (res.status !== 200 && res.status !== 201) return { ok: false };
  const thread = await fetchChatThread(token, input);
  return { ok: true, thread: typeof thread === 'object' ? thread : undefined };
}

export async function editChatMessageAction(
  input: ChatTarget & { messageId: number; newBody: string }
): Promise<{ ok: boolean; error?: 'already_read' | 'failed'; thread?: ChatThread }> {
  const token = await getAuthToken();
  if (!token) return { ok: false, error: 'failed' };
  const body: Record<string, unknown> = {
    action: 'edit',
    message_id: input.messageId,
    body: input.newBody.trim(),
  };
  if (input.studentId && input.studentId > 0) body.student_id = input.studentId;
  if (input.peerTeacherId && input.peerTeacherId > 0) body.peer_teacher_id = input.peerTeacherId;

  const res = await authRequest('teacher_student_messages.php', {
    token,
    method: 'POST',
    body,
  });
  if (res.status === 409) return { ok: false, error: 'already_read' };
  if (res.status !== 200) return { ok: false, error: 'failed' };
  const thread = await fetchChatThread(token, input);
  return { ok: true, thread: typeof thread === 'object' ? thread : undefined };
}

export async function fetchVocabQuizDetailAction(
  resultId: number
): Promise<VocabQuizResultDetail | null> {
  const token = await getAuthToken();
  if (!token || !Number.isFinite(resultId) || resultId <= 0) return null;

  const res = await authRequest('vocab_quiz_result_detail.php', {
    token,
    params: { id: Math.floor(resultId) },
  });
  if (res.status !== 200 || !res.json || typeof res.json !== 'object') return null;
  const root = res.json as Record<string, unknown>;
  const r =
    root.result && typeof root.result === 'object'
      ? (root.result as Record<string, unknown>)
      : root;
  const rawItems = Array.isArray(root.items)
    ? root.items
    : Array.isArray(r.items)
      ? r.items
      : [];
  const items: VocabQuizDetailItem[] = rawItems
    .map((entry): VocabQuizDetailItem | null => {
      if (!entry || typeof entry !== 'object') return null;
      const m = entry as Record<string, unknown>;
      const word = typeof m.word === 'string' ? m.word.trim() : '';
      if (!word) return null;
      return {
        word,
        meaning: typeof m.meaning === 'string' && m.meaning.trim() ? m.meaning.trim() : null,
        correct: m.correct === true || m.correct === 1 || m.is_correct === true || m.is_correct === 1,
      };
    })
    .filter((x): x is VocabQuizDetailItem => x !== null);

  return {
    id: typeof r.id === 'number' ? r.id : Math.floor(resultId),
    bookId: typeof r.book_id === 'number' ? r.book_id : 0,
    bookTitle: typeof r.book_title === 'string' ? r.book_title : null,
    quizName: typeof r.quiz_name === 'string' ? r.quiz_name : null,
    correct: typeof r.correct === 'number' ? r.correct : items.filter((i) => i.correct).length,
    wrong: typeof r.wrong === 'number' ? r.wrong : items.filter((i) => !i.correct).length,
    createdAt: typeof r.created_at === 'string' ? r.created_at : null,
    items,
  };
}

export async function updateProfileAction(input: {
  displayName: string;
  bio: string;
  avatar: string;
}): Promise<{ ok: boolean; account?: Account }> {
  const token = await getAuthToken();
  if (!token) return { ok: false };
  const res = await authRequest('update_profile.php', {
    token,
    method: 'POST',
    body: {
      display_name: input.displayName.trim(),
      bio: input.bio.trim(),
      avatar: input.avatar.trim() || 'm1',
    },
  });
  if (res.status !== 200) return { ok: false };
  const account = parseAccount(res.json) ?? undefined;
  revalidatePath('/[locale]/profile', 'page');
  revalidatePath('/[locale]/you', 'page');
  return { ok: true, account };
}

export async function uploadProfilePhotoAction(
  formData: FormData
): Promise<{ ok: boolean; account?: Account }> {
  const token = await getAuthToken();
  if (!token) return { ok: false };
  try {
    const res = await fetch(buildUrl('upload_avatar.php'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { ok: false };
    const json: unknown = await res.json().catch(() => null);
    const account = parseAccount(json) ?? undefined;
    revalidatePath('/[locale]/profile', 'page');
    revalidatePath('/[locale]/you', 'page');
    return { ok: true, account };
  } catch {
    return { ok: false };
  }
}
