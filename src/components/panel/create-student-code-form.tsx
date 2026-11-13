'use client';

import { useActionState } from 'react';

import { createStudentCodeAction, type CodeActionState } from '@/lib/auth/panel-actions';

export function CreateStudentCodeForm({
  labels,
}: {
  labels: { title: string; submit: string; failed: string };
}) {
  const [state, formAction] = useActionState(createStudentCodeAction, {} as CodeActionState);

  return (
    <form action={formAction} className="jelly-card mb-4 rounded-[var(--radius-card)] p-4">
      <p className="text-on-surface mb-3 font-extrabold">{labels.title}</p>
      {state.ok && state.code ? (
        <p className="text-primary mb-3 font-extrabold tabular-nums" dir="ltr">
          {state.code}
        </p>
      ) : null}
      {state.error === 'failed' ? (
        <p className="text-error mb-2 text-sm font-bold">{labels.failed}</p>
      ) : null}
      <button type="submit" className="bg-secondary text-on-secondary min-h-11 w-full rounded-full font-extrabold">
        {labels.submit}
      </button>
    </form>
  );
}
