import 'server-only';

import { authRequest } from './api';
import type {
  AdminUserRow,
  AdminUsersList,
  ClassScheduleSlot,
  ClassSession,
  GrammarResultRow,
  MessagesUnreadSummary,
  SessionBlock,
  StudentClassSessions,
  StudentFinancialRow,
  TeacherFinancialSummary,
  TeacherFinancialTotals,
  TeacherStudentRow,
  VocabQuizResultRow,
} from './panel-types';

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseSessionBlock(value: unknown): SessionBlock {
  const map = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const raw = Array.isArray(map.sessions) ? map.sessions : [];
  const sessions: ClassSession[] = raw
    .map((row): ClassSession | null => {
      if (!row || typeof row !== 'object') return null;
      const s = row as Record<string, unknown>;
      const id = num(s.id);
      if (id == null) return null;
      return {
        id,
        index: num(s.index) ?? num(s.session_index) ?? 0,
        recordedAt: typeof s.recorded_at === 'string' ? s.recorded_at : '',
        groupId: num(s.group_id),
      };
    })
    .filter((row): row is ClassSession => row != null);
  const note = typeof map.note === 'string' ? map.note.trim() : '';
  const count = sessions.length > 0 ? sessions.length : (num(map.session_count) ?? 0);
  return { sessionCount: count, note: note || null, sessions };
}

export async function fetchAdminUsers(
  token: string,
  q?: string
): Promise<AdminUsersList | 'forbidden' | 'failed'> {
  const result = await authRequest('admin_users.php', {
    token,
    params: { limit: 500, offset: 0, ...(q ? { q } : {}) },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  if (!root || !Array.isArray(root.users)) return 'failed';

  const users: AdminUserRow[] = root.users
    .map((row): AdminUserRow | null => {
      if (!row || typeof row !== 'object') return null;
      const u = row as Record<string, unknown>;
      const id = num(u.id);
      const email = typeof u.email === 'string' ? u.email.trim() : '';
      if (id == null || !email) return null;
      const tid = u.teacher_user_id;
      let teacherUserId: number | null = num(tid);
      if (teacherUserId != null && teacherUserId <= 0) teacherUserId = null;
      const dn = typeof u.display_name === 'string' ? u.display_name.trim() : '';
      const tn = typeof u.teacher_name === 'string' ? u.teacher_name.trim() : '';
      return {
        id,
        email,
        displayName: dn || email,
        studentAccess: flag(u.student_access),
        isTeacher: flag(u.is_teacher),
        isAdmin: flag(u.is_admin),
        teacherUserId,
        teacherName: tn || null,
        installedAppVersionCode: num(u.installed_app_version_code ?? u.app_installed_version_code),
        installedAppVersionName:
          typeof u.installed_app_version_name === 'string'
            ? u.installed_app_version_name.trim()
            : typeof u.app_installed_version_name === 'string'
              ? u.app_installed_version_name.trim()
              : null,
      };
    })
    .filter((row): row is AdminUserRow => row != null);

  const activeRaw = root.active_app_version;
  let activeAppVersion: AdminUsersList['activeAppVersion'] = null;
  if (activeRaw && typeof activeRaw === 'object') {
    const a = activeRaw as Record<string, unknown>;
    const code = num(a.version_code);
    const name = typeof a.version_name === 'string' ? a.version_name.trim() : '';
    if (code != null) activeAppVersion = { versionCode: code, versionName: name };
  }

  return { users, activeAppVersion };
}

export async function fetchTeacherStudents(
  token: string,
  inbox: boolean
): Promise<TeacherStudentRow[] | 'forbidden' | 'failed'> {
  const result = await authRequest('teacher_students.php', {
    token,
    params: inbox ? { inbox: 1 } : {},
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  if (!root || !Array.isArray(root.students)) return 'failed';

  return root.students
    .map((row): TeacherStudentRow | null => {
      if (!row || typeof row !== 'object') return null;
      const s = row as Record<string, unknown>;
      const id = num(s.id);
      const email = typeof s.email === 'string' ? s.email.trim() : '';
      if (id == null || !email) return null;
      const name = typeof s.display_name === 'string' ? s.display_name.trim() : '';
      const avatar = typeof s.avatar === 'string' && s.avatar.trim() ? s.avatar.trim() : 'm1';
      const preview = typeof s.last_message_preview === 'string' ? s.last_message_preview : null;
      return {
        id,
        email,
        displayName: name || email,
        avatar,
        sessionCount: num(s.session_count) ?? 0,
        unreadFromStudent: num(s.unread_from_student) ?? 0,
        lastMessageAt: typeof s.last_message_at === 'string' ? s.last_message_at : null,
        lastMessagePreview: preview,
        note: typeof s.note === 'string' ? s.note.trim() || null : null,
      };
    })
    .filter((row): row is TeacherStudentRow => row != null);
}

export async function fetchMyClassSessions(
  token: string
): Promise<StudentClassSessions | 'forbidden' | 'failed'> {
  const result = await authRequest('my_class_sessions.php', { token });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  if (!root) return 'failed';

  const personal = parseSessionBlock(root.personal ?? root);
  const rawGroups = Array.isArray(root.class_groups) ? root.class_groups : [];
  const groups = rawGroups
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const g = row as Record<string, unknown>;
      const id = num(g.id);
      const name = typeof g.name === 'string' ? g.name.trim() : '';
      if (id == null || !name) return null;
      const note = typeof g.note === 'string' ? g.note.trim() || null : null;
      return { id, name, note, info: parseSessionBlock(g) };
    })
    .filter((g): g is NonNullable<typeof g> => g != null);

  return { personal, groups };
}

export type ChatMessage = {
  id: number;
  body: string;
  createdAt: string;
  fromTeacher: boolean;
};

export async function fetchTeacherChat(
  token: string,
  studentId: number
): Promise<{ messages: ChatMessage[]; studentName: string } | 'forbidden' | 'failed'> {
  const result = await authRequest('teacher_student_messages.php', {
    token,
    params: { student_id: studentId, limit: 80 },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  if (!root) return 'failed';
  const raw = Array.isArray(root.messages) ? root.messages : [];
  const student = root.student && typeof root.student === 'object' ? (root.student as Record<string, unknown>) : null;
  const studentName =
    typeof student?.display_name === 'string' && student.display_name.trim()
      ? student.display_name.trim()
      : typeof student?.email === 'string'
        ? student.email
        : '';

  const messages: ChatMessage[] = raw
    .map((row): ChatMessage | null => {
      if (!row || typeof row !== 'object') return null;
      const m = row as Record<string, unknown>;
      const id = num(m.id);
      if (id == null) return null;
      return {
        id,
        body: typeof m.body === 'string' ? m.body : '',
        createdAt: typeof m.created_at === 'string' ? m.created_at : '',
        fromTeacher: flag(m.from_teacher),
      };
    })
    .filter((m): m is ChatMessage => m != null);

  return { messages, studentName };
}

export async function fetchMessagesUnreadSummary(
  token: string
): Promise<MessagesUnreadSummary | 'failed'> {
  const result = await authRequest('teacher_student_messages.php', {
    token,
    params: { summary: 1 },
  });
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  if (!root) return 'failed';
  return {
    isTeacher: flag(root.is_teacher),
    teacherStudentsWithUnread: num(root.teacher_students_with_unread) ?? 0,
    studentUnreadFromTeacher: num(root.student_unread_from_teacher) ?? 0,
  };
}

export async function fetchTeacherStudentVocabResults(
  token: string,
  studentId: number,
  limit = 100
): Promise<VocabQuizResultRow[] | 'forbidden' | 'failed'> {
  const result = await authRequest('teacher_student_vocab_results.php', {
    token,
    params: { student_id: studentId, limit },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  const raw = root && Array.isArray(root.results) ? root.results : null;
  if (!raw) return 'failed';

  return raw
    .map((row): VocabQuizResultRow | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const id = num(r.id);
      const bookId = num(r.book_id);
      if (id == null || bookId == null) return null;
      const units: number[] = [];
      if (Array.isArray(r.units)) {
        for (const u of r.units) {
          if (typeof u === 'number' && Number.isFinite(u)) units.push(u);
        }
      }
      const score = num(r.score);
      const total = num(r.total_questions);
      let correct = num(r.correct) ?? score ?? 0;
      let wrong = num(r.wrong);
      if (wrong == null && total != null) wrong = Math.max(0, total - correct);
      wrong ??= 0;
      correct ??= 0;
      return {
        id,
        bookId,
        bookTitle: typeof r.book_title === 'string' ? r.book_title.trim() || null : null,
        quizName: typeof r.quiz_name === 'string' ? r.quiz_name.trim() || null : null,
        units,
        correct,
        wrong,
        createdAt: typeof r.created_at === 'string' ? r.created_at : null,
      };
    })
    .filter((row): row is VocabQuizResultRow => row != null);
}

export async function fetchTeacherStudentGrammarResults(
  token: string,
  studentId: number
): Promise<GrammarResultRow[] | 'forbidden' | 'failed'> {
  const result = await authRequest('teacher_student_grammar_results.php', {
    token,
    params: { student_id: studentId },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  const raw = root && Array.isArray(root.results) ? root.results : null;
  if (!raw) return 'failed';

  return raw
    .map((row): GrammarResultRow | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const id = num(r.id);
      if (id == null) return null;
      return {
        id,
        createdAt: typeof r.created_at === 'string' ? r.created_at : '',
        quizName: typeof r.quiz_name === 'string' ? r.quiz_name : '',
        score: num(r.score),
        totalQuestions: num(r.total_questions),
      };
    })
    .filter((row): row is GrammarResultRow => row != null);
}

export async function fetchTeacherStudentSessions(
  token: string,
  studentId: number
): Promise<StudentClassSessions | 'forbidden' | 'failed'> {
  const result = await authRequest('teacher_student_sessions.php', {
    token,
    params: { student_id: studentId },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  if (!root) return 'failed';

  const personal = parseSessionBlock(root.personal ?? root);
  const rawGroups = Array.isArray(root.class_groups) ? root.class_groups : [];
  const groups = rawGroups
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const g = row as Record<string, unknown>;
      const id = num(g.id);
      const name = typeof g.name === 'string' ? g.name.trim() : '';
      if (id == null || !name) return null;
      const note = typeof g.note === 'string' ? g.note.trim() || null : null;
      return { id, name, note, info: parseSessionBlock(g) };
    })
    .filter((g): g is NonNullable<typeof g> => g != null);

  return { personal, groups };
}

export async function fetchTeacherStudentSchedule(
  token: string,
  studentId: number
): Promise<ClassScheduleSlot[] | 'forbidden' | 'failed'> {
  const result = await authRequest('teacher_student_schedule.php', {
    token,
    params: { student_id: studentId },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  const raw = root && Array.isArray(root.slots) ? root.slots : null;
  if (!raw) return 'failed';

  return raw
    .map((row): ClassScheduleSlot | null => {
      if (!row || typeof row !== 'object') return null;
      const s = row as Record<string, unknown>;
      const id = num(s.id);
      const weekday = num(s.weekday);
      const start = typeof s.start_time === 'string' ? s.start_time.trim() : '';
      if (id == null || weekday == null || !start) return null;
      const endRaw = typeof s.end_time === 'string' ? s.end_time.trim() : '';
      const labelRaw = typeof s.label === 'string' ? s.label.trim() : '';
      return {
        id,
        weekday,
        startTime: start,
        endTime: endRaw ? endRaw : null,
        label: labelRaw ? labelRaw : null,
      };
    })
    .filter((row): row is ClassScheduleSlot => row != null);
}

function parseFinancialTotals(value: unknown): TeacherFinancialTotals {
  const map = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    received: typeof map.received === 'number' ? map.received : Number(map.received) || 0,
    unpaid: typeof map.unpaid === 'number' ? map.unpaid : Number(map.unpaid) || 0,
    sessionCount: num(map.session_count) ?? 0,
    paidTermCount: num(map.paid_term_count) ?? 0,
    unpaidTermCount: num(map.unpaid_term_count) ?? 0,
  };
}

export async function fetchTeacherFinancialSummary(
  token: string
): Promise<TeacherFinancialSummary | 'forbidden' | 'failed'> {
  const result = await authRequest('teacher_financial_summary.php', {
    token,
    params: {
      period: 'lifetime',
      payment_status: 'all',
      group_by: 'student',
    },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  if (!root) return 'failed';

  const rawStudents = Array.isArray(root.by_student) ? root.by_student : [];
  const byStudent: StudentFinancialRow[] = rawStudents
    .map((row): StudentFinancialRow | null => {
      if (!row || typeof row !== 'object') return null;
      const s = row as Record<string, unknown>;
      const studentId = num(s.student_id);
      if (studentId == null) return null;
      const avatar =
        typeof s.avatar === 'string' && s.avatar.trim() ? s.avatar.trim() : 'm1';
      return {
        studentId,
        displayName:
          typeof s.display_name === 'string' && s.display_name.trim()
            ? s.display_name.trim()
            : '',
        avatar,
        received: typeof s.received === 'number' ? s.received : Number(s.received) || 0,
        unpaid: typeof s.unpaid === 'number' ? s.unpaid : Number(s.unpaid) || 0,
        sessionPrice:
          typeof s.session_price === 'number' ? s.session_price : Number(s.session_price) || 0,
        sessionCount: num(s.session_count) ?? 0,
      };
    })
    .filter((row): row is StudentFinancialRow => row != null);

  const currency =
    typeof root.currency_code === 'string' && root.currency_code.trim()
      ? root.currency_code.trim()
      : 'IRR';

  return {
    pricingAvailable: root.pricing_available !== false,
    periodLabel: typeof root.period_label === 'string' ? root.period_label : '',
    currencyCode: currency,
    totals: parseFinancialTotals(root.totals),
    byStudent,
  };
}

export type GrammarResultDetail = GrammarResultRow & {
  session: unknown | null;
};

export async function fetchGrammarResultDetail(
  token: string,
  resultId: number
): Promise<GrammarResultDetail | 'forbidden' | 'not_found' | 'failed'> {
  const result = await authRequest('grammar_result_detail.php', {
    token,
    params: { id: resultId },
  });
  if (result.status === 401 || result.status === 403) return 'forbidden';
  if (result.status === 404) return 'not_found';
  if (result.status !== 200) return 'failed';
  const root = result.json as Record<string, unknown> | null;
  const raw = root?.result;
  if (!raw || typeof raw !== 'object') return 'failed';
  const r = raw as Record<string, unknown>;
  const id = num(r.id);
  if (id == null) return 'failed';
  return {
    id,
    createdAt: typeof r.created_at === 'string' ? r.created_at : '',
    quizName: typeof r.quiz_name === 'string' ? r.quiz_name : '',
    score: num(r.score),
    totalQuestions: num(r.total_questions),
    session: r.session ?? null,
  };
}
