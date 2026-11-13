import 'server-only';

import { authRequest } from './api';

export type TeacherMessagesPreview = {
  unreadCount: number;
  peerCount: number;
  teacherName: string | null;
  lastBody: string | null;
  lastAt: string | null;
};

export function parseTeacherMessagesPreview(json: unknown): TeacherMessagesPreview | null {
  if (!json || typeof json !== 'object') return null;
  const root = json as Record<string, unknown>;
  const teacher = root.teacher && typeof root.teacher === 'object' ? (root.teacher as Record<string, unknown>) : null;
  const last =
    root.last_message && typeof root.last_message === 'object'
      ? (root.last_message as Record<string, unknown>)
      : null;
  const name =
    typeof teacher?.display_name === 'string' && teacher.display_name.trim()
      ? teacher.display_name.trim()
      : null;
  return {
    unreadCount: typeof root.unread_count === 'number' ? root.unread_count : 0,
    peerCount: typeof root.peer_count === 'number' ? root.peer_count : 0,
    teacherName: name,
    lastBody: typeof last?.body === 'string' ? last.body : null,
    lastAt: typeof last?.created_at === 'string' ? last.created_at : null,
  };
}

export async function fetchTeacherMessagesPreview(token: string): Promise<TeacherMessagesPreview | null> {
  const result = await authRequest('teacher_student_messages.php', {
    token,
    params: { preview: 1 },
  });
  if (result.status !== 200) return null;
  return parseTeacherMessagesPreview(result.json);
}
