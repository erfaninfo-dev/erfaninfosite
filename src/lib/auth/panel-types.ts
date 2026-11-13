/**
 * Shapes returned by admin and teacher panel endpoints (see app `api/*.php`).
 */

export type AdminUserRow = {
  id: number;
  email: string;
  displayName: string;
  studentAccess: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  teacherUserId: number | null;
  teacherName: string | null;
  installedAppVersionCode: number | null;
  installedAppVersionName: string | null;
};

export type AdminUsersList = {
  users: AdminUserRow[];
  activeAppVersion: { versionCode: number; versionName: string } | null;
};

export type TeacherStudentRow = {
  id: number;
  email: string;
  displayName: string;
  avatar: string;
  sessionCount: number;
  unreadFromStudent: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  note: string | null;
};

export type ClassSession = {
  id: number;
  index: number;
  recordedAt: string;
  groupId: number | null;
};

export type SessionBlock = {
  sessionCount: number;
  note: string | null;
  sessions: ClassSession[];
};

export type StudentClassSessions = {
  personal: SessionBlock;
  groups: Array<{ id: number; name: string; note: string | null; info: SessionBlock }>;
};

export type VocabQuizResultRow = {
  id: number;
  bookId: number;
  bookTitle: string | null;
  quizName: string | null;
  units: number[];
  correct: number;
  wrong: number;
  createdAt: string | null;
};

export type GrammarResultRow = {
  id: number;
  createdAt: string;
  quizName: string;
  score: number | null;
  totalQuestions: number | null;
};

export type ClassScheduleSlot = {
  id: number;
  weekday: number;
  startTime: string;
  endTime: string | null;
  label: string | null;
};

export type MessagesUnreadSummary = {
  isTeacher: boolean;
  teacherStudentsWithUnread: number;
  studentUnreadFromTeacher: number;
};

export type TeacherFinancialTotals = {
  received: number;
  unpaid: number;
  sessionCount: number;
  paidTermCount: number;
  unpaidTermCount: number;
};

export type StudentFinancialRow = {
  studentId: number;
  displayName: string;
  avatar: string;
  received: number;
  unpaid: number;
  sessionPrice: number;
  sessionCount: number;
};

export type TeacherFinancialSummary = {
  pricingAvailable: boolean;
  periodLabel: string;
  currencyCode: string;
  totals: TeacherFinancialTotals;
  byStudent: StudentFinancialRow[];
};
