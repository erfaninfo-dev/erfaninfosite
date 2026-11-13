/**
 * The signed-in reader, as `me.php` and the login response describe them.
 *
 * This module only parses. It never sees the token.
 */

export type Account = {
  id: number;
  email: string;
  displayName: string;
  avatar: string;
  studentAccess: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  teacherUserId: number | null;
};

/** Class books are the student catalog. Teachers and admins see it too. */
export function hasClassAccess(account: Account): boolean {
  return account.studentAccess || account.isTeacher || account.isAdmin;
}

export type AuthFormState = {
  error?:
    | 'email'
    | 'email-invalid'
    | 'short'
    | 'confirm'
    | 'match'
    | 'code'
    | 'required'
    | 'invalid'
    | 'taken'
    | 'failed';
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export function parseAccount(json: unknown): Account | null {
  const root = record(json);
  const user = record(root?.user) ?? root;
  if (!user) return null;

  const id = typeof user.id === 'number' ? user.id : null;
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  if (id == null || !email) return null;

  const name = typeof user.display_name === 'string' ? user.display_name.trim() : '';
  const avatarRaw = typeof user.avatar === 'string' ? user.avatar.trim() : '';
  const teacherRaw = user.teacher_user_id;
  const teacherUserId =
    typeof teacherRaw === 'number' && Number.isFinite(teacherRaw)
      ? teacherRaw
      : typeof teacherRaw === 'string' && /^\d+$/.test(teacherRaw)
        ? Number(teacherRaw)
        : null;
  return {
    id,
    email,
    displayName: name || email,
    avatar: avatarRaw || 'm1',
    studentAccess: flag(user.student_access),
    isTeacher: flag(user.is_teacher),
    isAdmin: flag(user.is_admin),
    teacherUserId: teacherUserId && teacherUserId > 0 ? teacherUserId : null,
  };
}

/** Opaque bearer token. Reject anything that could break a header. */
export function parseToken(json: unknown): string | null {
  const token = record(json)?.token;
  if (typeof token !== 'string') return null;
  if (token.length < 8 || token.length > 4000) return null;
  if (/[\s\u0000-\u001f]/.test(token)) return null;
  return token;
}

export function apiErrorText(json: unknown): string {
  const error = record(json)?.error;
  return typeof error === 'string' ? error.slice(0, 300) : '';
}
