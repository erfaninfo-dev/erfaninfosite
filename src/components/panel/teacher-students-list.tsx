import Link from 'next/link';
import type { Route } from 'next';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import type { TeacherStudentRow } from '@/lib/auth/panel-types';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export function TeacherStudentsList({
  locale,
  students,
  inbox,
}: {
  locale: Locale;
  students: TeacherStudentRow[];
  inbox: boolean;
}) {
  if (students.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-2">
      {students.map((student) => (
        <li key={student.id}>
          <Link
            href={localeHref(
              locale,
              (inbox
                ? `/teacher/chat/${student.id}`
                : `/teacher/student/${student.id}`) as Route
            )}
            className="jelly-card flex items-center gap-3 rounded-[var(--radius-card)] p-4 no-underline"
          >
            <ProfileAvatar avatarId={student.avatar} size={44} />
            <span className="min-w-0 flex-1">
              <span className="text-on-surface block truncate font-extrabold">
                {student.displayName}
              </span>
              {inbox && student.lastMessagePreview ? (
                <span className="text-on-surface-variant line-clamp-2 text-sm">
                  {student.lastMessagePreview}
                </span>
              ) : (
                <span className="text-on-surface-variant text-sm">
                  {student.sessionCount > 0 ? `${student.sessionCount} sessions` : student.email}
                </span>
              )}
            </span>
            {student.unreadFromStudent > 0 ? (
              <span className="bg-primary-container text-on-primary-container min-w-8 rounded-full px-2 py-1 text-center text-xs font-extrabold">
                {student.unreadFromStudent > 99 ? '99+' : student.unreadFromStudent}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
