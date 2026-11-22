import 'server-only';

import { authRequest } from './api';

export type TeacherMessagesPreview = {
  unreadCount: number;
  peerCount: number;
  teacherName: string | null;
  lastBody: string | null;
  lastAt: string | null;
};

export type StudentMessagePeer = {
  teacherUserId: number;
  displayName: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
};

export type ChatPeerInfo = {
  id: number;
  displayName: string | null;
  avatar: string | null;
};

export type ChatMessageRow = {
  id: number;
  senderUserId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  editedAt: string | null;
};

export type ChatThread = {
  teacher: ChatPeerInfo | null;
  student: ChatPeerInfo | null;
  messages: ChatMessageRow[];
};

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
  return null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function parseTeacherMessagesPreview(json: unknown): TeacherMessagesPreview | null {
  const root = rec(json);
  if (!root) return null;
  const teacher = rec(root.teacher);
  const last = rec(root.last_message);
  return {
    unreadCount: typeof root.unread_count === 'number' ? root.unread_count : 0,
    peerCount: typeof root.peer_count === 'number' ? root.peer_count : 0,
    teacherName: str(teacher?.display_name),
    lastBody: typeof last?.body === 'string' ? last.body : null,
    lastAt: typeof last?.created_at === 'string' ? last.created_at : null,
  };
}

export async function fetchTeacherMessagesPreview(
  token: string
): Promise<TeacherMessagesPreview | null> {
  const result = await authRequest('teacher_student_messages.php', {
    token,
    params: { preview: 1 },
  });
  if (result.status !== 200) return null;
  return parseTeacherMessagesPreview(result.json);
}

export async function fetchStudentMessagePeers(
  token: string
): Promise<StudentMessagePeer[] | 'forbidden' | 'failed'> {
  const result = await authRequest('teacher_student_messages.php', {
    token,
    params: { list_peers: 1 },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = rec(result.json);
  const raw = Array.isArray(root?.peers) ? root.peers : [];
  return raw
    .map((entry): StudentMessagePeer | null => {
      const m = rec(entry);
      if (!m) return null;
      const teacherUserId = num(m.teacher_user_id ?? m.id);
      if (teacherUserId == null || teacherUserId <= 0) return null;
      return {
        teacherUserId,
        displayName: str(m.display_name ?? m.name),
        unreadCount: num(m.unread_count) ?? 0,
        lastMessageAt: str(m.last_message_at),
      };
    })
    .filter((p): p is StudentMessagePeer => p !== null);
}

function parsePeer(raw: unknown): ChatPeerInfo | null {
  const m = rec(raw);
  if (!m) return null;
  const id = num(m.id ?? m.user_id);
  if (id == null) return null;
  return {
    id,
    displayName: str(m.display_name ?? m.name ?? m.email),
    avatar: str(m.avatar),
  };
}

export function parseChatThread(json: unknown): ChatThread | null {
  const root = rec(json);
  if (!root) return null;
  const rawMessages = Array.isArray(root.messages) ? root.messages : [];
  const messages: ChatMessageRow[] = rawMessages
    .map((entry): ChatMessageRow | null => {
      const m = rec(entry);
      if (!m) return null;
      const id = num(m.id);
      if (id == null) return null;
      return {
        id,
        senderUserId: num(m.sender_user_id ?? m.sender_id) ?? 0,
        body: typeof m.body === 'string' ? m.body : '',
        createdAt: typeof m.created_at === 'string' ? m.created_at : '',
        readAt: str(m.read_at),
        editedAt: str(m.edited_at),
      };
    })
    .filter((m): m is ChatMessageRow => m !== null);

  return {
    teacher: parsePeer(root.teacher),
    student: parsePeer(root.student),
    messages,
  };
}

export async function fetchChatThread(
  token: string,
  opts: { studentId?: number | null; peerTeacherId?: number | null }
): Promise<ChatThread | 'forbidden' | 'failed'> {
  const params: Record<string, string | number> = { limit: 120 };
  if (opts.studentId && opts.studentId > 0) params.student_id = opts.studentId;
  if (opts.peerTeacherId && opts.peerTeacherId > 0) params.peer_teacher_id = opts.peerTeacherId;

  const result = await authRequest('teacher_student_messages.php', { token, params });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  return parseChatThread(result.json) ?? 'failed';
}
