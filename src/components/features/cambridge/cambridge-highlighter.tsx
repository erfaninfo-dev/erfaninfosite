'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type HighlightEntry = {
  id: string;
  scopeKey: string;
  start: number;
  end: number;
  quote: string;
  note?: string;
};

type TextRun = {
  text: string;
  bold: boolean;
  italic: boolean;
  start: number;
  end: number;
};

function parseRuns(raw: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let plainOffset = 0;
  let match: RegExpExecArray | null;

  const push = (text: string, bold: boolean, italic: boolean) => {
    if (!text) return;
    runs.push({
      text,
      bold,
      italic,
      start: plainOffset,
      end: plainOffset + text.length,
    });
    plainOffset += text.length;
  };

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > last) push(raw.slice(last, match.index), false, false);
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      push(token.slice(2, -2), true, false);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      push(token.slice(1, -1), false, true);
    } else {
      push(token, false, false);
    }
    last = match.index + token.length;
  }
  if (last < raw.length) push(raw.slice(last), false, false);
  return runs;
}

function speakWithAccent(text: string, lang: 'en-US' | 'en-GB') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore speech synthesis errors
  }
}

/**
 * Renders formatted passage text with persistent yellow `#FDE68A` highlights
 * and optional sticky-note indicator matching Testino.
 */
export function HighlightableText({
  text,
  scopeKey,
  highlights,
  onRemoveHighlight,
}: {
  text: string;
  scopeKey: string;
  highlights: HighlightEntry[];
  onRemoveHighlight?: (id: string) => void;
}) {
  const runs = parseRuns(text);
  const scoped = highlights
    .filter((h) => h.scopeKey === scopeKey)
    .sort((a, b) => a.start - b.start);

  const nodes: ReactNode[] = [];
  let keyIdx = 0;

  for (const run of runs) {
    const cuts = new Set<number>([run.start, run.end]);
    for (const h of scoped) {
      if (h.end <= run.start || h.start >= run.end) continue;
      cuts.add(Math.max(run.start, h.start));
      cuts.add(Math.min(run.end, h.end));
    }
    const sortedCuts = [...cuts].sort((a, b) => a - b);

    for (let i = 0; i < sortedCuts.length - 1; i += 1) {
      const segStart = sortedCuts[i]!;
      const segEnd = sortedCuts[i + 1]!;
      if (segEnd <= segStart) continue;

      const slice = run.text.slice(segStart - run.start, segEnd - run.start);
      const hit = scoped.find((h) => h.start <= segStart && h.end >= segEnd);

      let content: ReactNode = slice;
      if (run.bold) content = <strong className="font-bold">{content}</strong>;
      else if (run.italic) content = <em className="italic">{content}</em>;

      if (hit) {
        const isEnd = segEnd === hit.end;
        nodes.push(
          <mark
            key={`h-${keyIdx++}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveHighlight?.(hit.id);
            }}
            title={hit.note ? `Note: ${hit.note} (click to remove)` : 'Click to remove highlight'}
            className="cursor-pointer rounded-[2px] bg-[#FDE68A] px-[1px] text-[#202327]"
          >
            {content}
            {isEnd && hit.note?.trim() ? (
              <span className="ms-0.5 align-super text-[10px] font-bold text-amber-800">✎</span>
            ) : null}
          </mark>
        );
      } else {
        nodes.push(<span key={`t-${keyIdx++}`}>{content}</span>);
      }
    }
  }

  return (
    <span data-highlight-scope={scopeKey} className="select-text">
      {nodes}
    </span>
  );
}

type PendingSelection = {
  scopeKey: string;
  start: number;
  end: number;
  quote: string;
  x: number;
  y: number;
};

/**
 * Mirrors Testino's selection toolbar:
 * - Practice Mode: Highlight, Google Translate, Dictionary, American TTS, British TTS.
 * - Exam Mode: ONLY Note + Highlight (strict IELTS exam restrictions).
 */
export function HighlightableContainer({
  locale,
  mode = 'practice',
  highlighterActive,
  onAddHighlight,
  children,
}: {
  locale: Locale;
  mode?: 'practice' | 'exam';
  highlighterActive: boolean;
  onAddHighlight: (entry: HighlightEntry, openNotesDrawer: boolean) => void;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-cambridge-word-tools]')) return;
      setPending(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function captureSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPending(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const quote = sel.toString().trim();
    if (!quote) {
      setPending(null);
      return;
    }

    const startEl =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as HTMLElement)
        : range.startContainer.parentElement;
    const endEl =
      range.endContainer.nodeType === Node.ELEMENT_NODE
        ? (range.endContainer as HTMLElement)
        : range.endContainer.parentElement;

    const startScope = startEl?.closest<HTMLElement>('[data-highlight-scope]');
    const endScope = endEl?.closest<HTMLElement>('[data-highlight-scope]');
    if (!startScope || !endScope || startScope !== endScope) {
      setPending(null);
      return;
    }
    if (!containerRef.current?.contains(startScope)) {
      setPending(null);
      return;
    }

    const scopeKey = startScope.dataset.highlightScope;
    if (!scopeKey) return;

    const prefixRange = document.createRange();
    prefixRange.setStart(startScope, 0);
    prefixRange.setEnd(range.startContainer, range.startOffset);
    const start = prefixRange.toString().length;
    const end = start + range.toString().length;
    if (end <= start) return;

    // If top-bar Highlighter toggle is ON (Practice Mode), highlight immediately!
    if (mode === 'practice' && highlighterActive) {
      onAddHighlight(
        {
          id: `${scopeKey}:${start}-${end}:${Date.now()}`,
          scopeKey,
          start,
          end,
          quote: quote.slice(0, 140),
        },
        false
      );
      sel.removeAllRanges();
      setPending(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    setPending({
      scopeKey,
      start,
      end,
      quote: quote.slice(0, 140),
      x: Math.min(window.innerWidth - 170, Math.max(120, rect.left + rect.width / 2)),
      y: Math.min(window.innerHeight - 130, rect.bottom + 12),
    });
  }

  function commitHighlight(withNote: boolean) {
    if (!pending) return;
    onAddHighlight(
      {
        id: `${pending.scopeKey}:${pending.start}-${pending.end}:${Date.now()}`,
        scopeKey: pending.scopeKey,
        start: pending.start,
        end: pending.end,
        quote: pending.quote,
        note: '',
      },
      withNote
    );
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }

  const googleTarget = locale === 'fa' ? 'fa' : locale === 'ckb' ? 'ckb' : 'en';

  return (
    <div
      ref={containerRef}
      onMouseUp={captureSelection}
      onKeyUp={captureSelection}
      className="relative"
    >
      {children}

      {pending ? (
        mode === 'exam' ? (
          /* Exam Mode: ONLY Note + Highlight (strict Testino IELTS Exam Mode) */
          <div
            data-cambridge-word-tools
            dir="ltr"
            style={{
              left: `${pending.x}px`,
              top: `${pending.y}px`,
              transform: 'translateX(-50%)',
            }}
            className="fixed z-50 flex items-center gap-1 rounded-[12px] border border-[#CBD5E1] bg-white p-1.5 text-[#202327] shadow-xl"
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitHighlight(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold hover:bg-[#F1F2EB]"
            >
              <span>✎</span>
              <span>Note</span>
            </button>
            <span className="h-4 w-px bg-[#E5E7EB]" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitHighlight(false)}
              className="flex cursor-pointer items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold hover:bg-[#F1F2EB]"
            >
              <span className="size-2.5 rounded-xs bg-[#FDE68A] ring-1 ring-amber-400" />
              <span>Highlight</span>
            </button>
          </div>
        ) : (
          /* Practice Mode: full frosted reading tools bar */
          <div
            data-cambridge-word-tools
            dir="ltr"
            style={{
              left: `${pending.x}px`,
              top: `${pending.y}px`,
              transform: 'translateX(-50%)',
            }}
            className="fixed z-50 flex w-[320px] flex-wrap justify-center gap-1 rounded-[16px] bg-[#2F7C81]/20 p-1.5 text-black shadow-lg backdrop-blur-[16px]"
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitHighlight(false)}
              className="flex h-[49px] w-[72px] cursor-pointer flex-col items-center justify-center rounded-[12px] text-[11px] font-medium hover:bg-white/40"
            >
              <span className="text-base leading-none">✎</span>
              <span>Highlight</span>
            </button>

            <a
              href={`https://translate.google.com/?sl=en&tl=${googleTarget}&text=${encodeURIComponent(pending.quote)}&op=translate`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setPending(null)}
              className="flex h-[49px] w-[72px] flex-col items-center justify-center rounded-[12px] text-[11px] font-medium text-black no-underline hover:bg-white/40"
            >
              <span className="text-base leading-none">文</span>
              <span>Google</span>
            </a>

            <a
              href={`${localeHref(locale, '/search')}?q=${encodeURIComponent(pending.quote.split(/\s+/)[0] ?? pending.quote)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setPending(null)}
              className="flex h-[49px] w-[72px] flex-col items-center justify-center rounded-[12px] text-[11px] font-medium text-black no-underline hover:bg-white/40"
            >
              <span className="text-base leading-none">📖</span>
              <span>Dictionary</span>
            </a>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                speakWithAccent(pending.quote, 'en-US');
                setPending(null);
              }}
              className="flex h-[49px] w-[72px] cursor-pointer flex-col items-center justify-center rounded-[12px] text-[11px] font-medium hover:bg-white/40"
            >
              <span className="text-base leading-none">🔊</span>
              <span>American</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                speakWithAccent(pending.quote, 'en-GB');
                setPending(null);
              }}
              className="flex h-[49px] w-[72px] cursor-pointer flex-col items-center justify-center rounded-[12px] text-[11px] font-medium hover:bg-white/40"
            >
              <span className="text-base leading-none">🔊</span>
              <span>British</span>
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
