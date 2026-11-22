'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import {
  IconArrowBack,
  IconCheck,
  IconClose,
  IconDoubleCheck,
  IconEdit,
  IconSend,
} from '@/components/ui/icons';
import {
  editChatMessageAction,
  markChatReadAction,
  pollChatThreadAction,
  sendChatMessageAction,
} from '@/lib/auth/panel-actions';
import type { ChatMessageRow, ChatThread } from '@/lib/auth/you-fetch';
import { cn } from '@/lib/cn';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';

export type ChatThreadLabels = {
  back: string;
  titleFallback: string;
  subtitle: string;
  updating: string;
  empty: string;
  senderYou: string;
  edit: string;
  edited: string;
  editTitle: string;
  editHint: string;
  editFailedRead: string;
  cancel: string;
  save: string;
  messagePlaceholder: string;
  sendLabel: string;
  sentLabel: string;
  readLabel: string;
  errorGeneric: string;
};

/** Detects RTL vs LTR for a message string (matching Flutter `chat_text_direction.dart`). */
function detectDirection(text: string): 'rtl' | 'ltr' {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // Arabic / Persian / Kurdish / Hebrew ranges
    if (
      (code >= 0x0590 && code <= 0x08ff) ||
      (code >= 0xfb1d && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff)
    ) {
      return 'rtl';
    }
    if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
      return 'ltr';
    }
  }
  return 'ltr';
}

function parseApiDate(raw: string): Date | null {
  if (!raw.trim()) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function ChatThreadClient({
  locale,
  backHref,
  myUserId,
  initialThread,
  studentId,
  peerTeacherId,
  peerAvatar = 'm1',
  labels,
}: {
  locale: Locale;
  backHref: Route;
  myUserId: number;
  initialThread: ChatThread;
  studentId?: number | null;
  peerTeacherId?: number | null;
  peerAvatar?: string;
  labels: ChatThreadLabels;
}) {
  const isTeacherView = studentId != null && studentId > 0;
  const [thread, setThread] = useState<ChatThread>(initialThread);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<ChatMessageRow | null>(null);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevCountRef = useRef(initialThread.messages.length);

  const scrollToBottom = useCallback(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mark read on initial mount & scroll to bottom.
  useEffect(() => {
    listEndRef.current?.scrollIntoView();
    void markChatReadAction({ studentId, peerTeacherId });
  }, [studentId, peerTeacherId]);

  // Scroll when message count grows.
  useEffect(() => {
    if (thread.messages.length > prevCountRef.current) {
      scrollToBottom();
    }
    prevCountRef.current = thread.messages.length;
  }, [thread.messages.length, scrollToBottom]);

  // Poll every 5 seconds while tab is visible (matching Flutter's 4s polling).
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (cancelled || document.hidden) return;
      setUpdating(true);
      try {
        const res = await pollChatThreadAction({ studentId, peerTeacherId });
        if (!cancelled && res.ok && res.thread) {
          setThread((prev) => {
            const prevLast = prev.messages.at(-1);
            const nextLast = res.thread!.messages.at(-1);
            const changed =
              prev.messages.length !== res.thread!.messages.length ||
              prevLast?.id !== nextLast?.id ||
              prevLast?.body !== nextLast?.body ||
              prevLast?.readAt !== nextLast?.readAt ||
              prevLast?.editedAt !== nextLast?.editedAt;
            if (changed) {
              void markChatReadAction({ studentId, peerTeacherId });
              return res.thread!;
            }
            return prev;
          });
        }
      } catch {
        /* ignore transient poll error */
      } finally {
        if (!cancelled) setUpdating(false);
      }
    };

    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [studentId, peerTeacherId]);

  const peer = isTeacherView ? thread.student : thread.teacher;
  const peerTitle = peer?.displayName?.trim() || labels.titleFallback;
  const peerId = peer?.id ?? (isTeacherView ? studentId : peerTeacherId) ?? null;

  const dayFmt = new Intl.DateTimeFormat(NUMBER_LOCALE[locale], { dateStyle: 'medium' });
  const timeFmt = new Intl.DateTimeFormat(NUMBER_LOCALE[locale], { timeStyle: 'short' });

  function startEdit(msg: ChatMessageRow) {
    setEditing(msg);
    setText(msg.body);
    setErrorMsg(null);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }

  function cancelEdit() {
    setEditing(null);
    setText('');
    setErrorMsg(null);
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setErrorMsg(null);
    try {
      if (editing) {
        if (trimmed === editing.body) {
          cancelEdit();
          return;
        }
        const res = await editChatMessageAction({
          messageId: editing.id,
          newBody: trimmed,
          studentId,
          peerTeacherId,
        });
        if (!res.ok) {
          if (res.error === 'already_read') {
            setErrorMsg(labels.editFailedRead);
            setEditing(null);
            setText('');
            const refreshed = await pollChatThreadAction({ studentId, peerTeacherId });
            if (refreshed.ok && refreshed.thread) setThread(refreshed.thread);
          } else {
            setErrorMsg(labels.errorGeneric);
          }
          return;
        }
        setEditing(null);
        setText('');
        if (res.thread) setThread(res.thread);
      } else {
        setText('');
        const res = await sendChatMessageAction({
          body: trimmed,
          studentId,
          peerTeacherId,
        });
        if (!res.ok) {
          setText(trimmed);
          setErrorMsg(labels.errorGeneric);
          return;
        }
        if (res.thread) setThread(res.thread);
        window.setTimeout(scrollToBottom, 50);
      }
    } finally {
      setSending(false);
    }
  }

  const inputDir = text.trim() ? detectDirection(text) : undefined;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      {/* Header matching Flutter `TeacherChatScreen` AppBar */}
      <div className="jelly-card mb-3 flex items-center gap-3 rounded-[var(--radius-card)] px-3.5 py-2.5">
        <Link
          href={backHref}
          aria-label={labels.back}
          className="bg-surface-1/80 text-on-surface-variant grid size-10 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <ProfileAvatar avatarId={peerAvatar} userId={peerId} size={42} />
        <div className="min-w-0 flex-1">
          <h1 className="text-on-surface truncate text-base font-extrabold">{peerTitle}</h1>
          <p
            className={cn(
              'truncate text-xs font-semibold',
              updating ? 'text-primary' : 'text-on-surface-variant'
            )}
          >
            {updating ? labels.updating : labels.subtitle}
          </p>
        </div>
      </div>

      {errorMsg ? (
        <p
          role="alert"
          className="bg-error-container text-on-error-container mb-3 rounded-2xl px-4 py-2.5 text-sm font-bold"
        >
          {errorMsg}
        </p>
      ) : null}

      {/* Message list */}
      <div className="jelly-inset flex-1 space-y-2.5 overflow-y-auto rounded-[var(--radius-card)] p-3.5 sm:p-4">
        {thread.messages.length === 0 ? (
          <p className="text-on-surface-variant py-16 text-center text-sm font-semibold">
            {labels.empty}
          </p>
        ) : (
          thread.messages.map((msg, i) => {
            const mine = msg.senderUserId === myUserId;
            const prev = i > 0 ? thread.messages[i - 1] : null;
            const showSender = !prev || prev.senderUserId !== msg.senderUserId;
            const dt = parseApiDate(msg.createdAt);
            const prevDt = prev ? parseApiDate(prev.createdAt) : null;
            const showDay = !prev || (dt != null && (prevDt == null || !sameLocalDay(dt, prevDt)));
            const isRead = msg.readAt != null && msg.readAt.trim() !== '';
            const isEdited = msg.editedAt != null && msg.editedAt.trim() !== '';
            const canEdit = mine && !isRead;
            const dir = detectDirection(msg.body);

            return (
              <div key={msg.id} className="flex flex-col">
                {showDay && dt ? (
                  <div className="my-2 flex justify-center">
                    <span className="bg-surface-2/90 text-on-surface-variant rounded-full px-3 py-1 text-[11px] font-bold">
                      {dayFmt.format(dt)}
                    </span>
                  </div>
                ) : null}

                <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                  {showSender ? (
                    <span className="text-on-surface-variant mb-1 px-2 text-[11px] font-bold">
                      {mine ? labels.senderYou : peerTitle}
                    </span>
                  ) : null}

                  <div
                    className={cn(
                      'group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs sm:max-w-[75%]',
                      mine
                        ? 'bg-primary-container text-on-primary-container rounded-ee-sm'
                        : 'bg-surface-1 text-on-surface border-outline-variant/50 rounded-es-sm border'
                    )}
                  >
                    <p dir={dir} className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {msg.body}
                    </p>

                    <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[11px] opacity-75">
                      {isEdited ? <span>{labels.edited}</span> : null}
                      {dt ? (
                        <span dir="ltr" className="tabular-nums">
                          {timeFmt.format(dt)}
                        </span>
                      ) : null}
                      {mine ? (
                        <span
                          aria-label={isRead ? labels.readLabel : labels.sentLabel}
                          title={isRead ? labels.readLabel : labels.sentLabel}
                        >
                          {isRead ? (
                            <IconDoubleCheck className="text-primary size-3.5" />
                          ) : (
                            <IconCheck className="size-3.5" />
                          )}
                        </span>
                      ) : null}
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => startEdit(msg)}
                          aria-label={labels.edit}
                          title={labels.edit}
                          className="hover:text-primary ms-1 rounded p-0.5 transition-colors"
                        >
                          <IconEdit className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Composer matching Flutter's Telegram-style input + inline edit bar */}
      <div className="bg-surface-1 border-outline-variant/60 sticky bottom-[calc(var(--size-bottom-nav)+0.5rem)] z-20 mt-3 overflow-hidden rounded-[var(--radius-card)] border shadow-[var(--shadow-soft)] md:bottom-4">
        {editing ? (
          <div className="bg-primary-container/50 border-outline-variant/40 flex items-center gap-2 border-b px-3.5 py-2">
            <IconEdit className="text-primary size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-extrabold">{labels.editTitle}</p>
              <p className="text-on-surface-variant truncate text-xs">{editing.body}</p>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label={labels.cancel}
              className="text-on-surface-variant grid size-8 place-items-center rounded-full"
            >
              <IconClose className="size-4" />
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex items-end gap-2 p-2.5">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            dir={inputDir}
            rows={1}
            placeholder={editing ? labels.editHint : labels.messagePlaceholder}
            className="bg-surface-2 text-on-surface placeholder:text-on-surface-variant max-h-32 min-h-11 flex-1 resize-none rounded-2xl border-0 px-3.5 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label={editing ? labels.save : labels.sendLabel}
            className="bg-primary text-on-primary grid size-11 shrink-0 place-items-center rounded-full shadow-sm disabled:opacity-45"
          >
            {editing ? <IconCheck className="size-5" /> : <IconSend className="size-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
