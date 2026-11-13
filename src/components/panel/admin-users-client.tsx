'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';

import { adminUpdateUserAction, type PanelActionState } from '@/lib/auth/panel-actions';
import type { AdminUserRow } from '@/lib/auth/panel-types';

export function AdminUsersClient({
  users,
  teachers,
  searchPlaceholder,
  labels,
}: {
  users: AdminUserRow[];
  teachers: AdminUserRow[];
  searchPlaceholder: string;
  labels: {
    email: string;
    student: string;
    teacher: string;
    assignTeacher: string;
    none: string;
    save: string;
    failed: string;
    appInstalled: string;
    appUnknown: string;
  };
}) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const [state, formAction] = useActionState(adminUpdateUserAction, {} as PanelActionState);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.teacherName?.toLowerCase().includes(q) ?? false)
    );
  }, [query, users]);

  if (state.ok) {
    router.refresh();
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="bg-surface-3 text-on-surface mb-4 h-12 w-full rounded-[var(--radius-input)] border-0 px-4"
      />
      {state.error === 'failed' ? (
        <p className="text-error mb-3 text-sm font-bold">{labels.failed}</p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {filtered.map((user) => (
          <li key={user.id} className="jelly-card rounded-[var(--radius-card)] p-4">
            <p className="text-on-surface font-extrabold">{user.displayName}</p>
            <p className="text-on-surface-variant text-sm" dir="ltr">
              {user.email}
            </p>
            <p className="text-on-surface-variant mt-1 text-xs">
              {user.installedAppVersionCode
                ? labels.appInstalled.replace(
                    '{version}',
                    `${user.installedAppVersionName ?? ''} (${user.installedAppVersionCode})`.trim()
                  )
                : labels.appUnknown}
            </p>
            <form action={formAction} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="user_id" value={user.id} />
              <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
                {labels.student}
                <select
                  name="student_access"
                  defaultValue={user.studentAccess ? '1' : '0'}
                  className="bg-surface-3 h-11 rounded-[var(--radius-input)] border-0 px-3"
                >
                  <option value="1">✓</option>
                  <option value="0">—</option>
                </select>
              </label>
              <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
                {labels.teacher}
                <select
                  name="is_teacher"
                  defaultValue={user.isTeacher ? '1' : '0'}
                  className="bg-surface-3 h-11 rounded-[var(--radius-input)] border-0 px-3"
                >
                  <option value="1">✓</option>
                  <option value="0">—</option>
                </select>
              </label>
              <label className="text-on-surface flex flex-col gap-1 text-sm font-bold">
                {labels.assignTeacher}
                <select
                  name="teacher_user_id"
                  defaultValue={user.teacherUserId?.toString() ?? 'none'}
                  className="bg-surface-3 text-on-surface h-11 rounded-[var(--radius-input)] border-0 px-3"
                >
                  <option value="none">{labels.none}</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="bg-primary text-on-primary mt-1 min-h-11 rounded-full font-extrabold"
              >
                {labels.save}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
