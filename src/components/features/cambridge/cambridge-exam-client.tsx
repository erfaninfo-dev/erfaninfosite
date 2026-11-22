'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  saveCambridgeStateAction,
  submitCambridgeAnswersAction,
} from '@/app/[locale]/books/[bookId]/cambridge/actions';
import { CambridgeAudioBar } from '@/components/features/cambridge/cambridge-audio-bar';
import {
  CambridgeGroupView,
  ReadingPassageView,
  SpeakingSegmentView,
  WritingPromptView,
  extractHeadingSlots,
  extractPassageObject,
  extractSpeakingItems,
  type AnswerMap,
  type KeyByNumber,
} from '@/components/features/cambridge/cambridge-blocks';
import {
  HighlightableContainer,
  type HighlightEntry,
} from '@/components/features/cambridge/cambridge-highlighter';
import { CambridgeReportDialog } from '@/components/features/cambridge/cambridge-report-dialog';
import {
  CambridgeTranslationProvider,
  type CambridgeTranslationLang,
} from '@/components/features/cambridge/cambridge-translation-context';
import { cn } from '@/lib/cn';
import type {
  CambridgeScore,
  CambridgeSection,
  CambridgeTranslationBundle,
  CambridgeUserState,
} from '@/lib/cambridge/api';
import type { CambridgeLabels, CambridgeSkill } from '@/lib/cambridge/labels';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';
import { stopSpeaking } from '@/lib/vocab/speak';

type Obj = Record<string, unknown>;
type TextSizeMode = 'standard' | 'large' | 'xlarge';
type ExamMode = 'practice' | 'exam';
type TimePacingId = 'much_slower' | 'slower' | 'standard' | 'faster' | 'much_faster';

const TIME_PACING_OPTIONS: ReadonlyArray<{
  id: TimePacingId;
  label: string;
  readingDeltaMin: number;
  speedMultiplier: number;
}> = [
  { id: 'much_slower', label: 'Much Slower (+10 Minutes ~ 0.8x)', readingDeltaMin: 10, speedMultiplier: 0.8 },
  { id: 'slower', label: 'Slower (+5 Minutes ~ 0.9x)', readingDeltaMin: 5, speedMultiplier: 0.9 },
  { id: 'standard', label: 'Standard Time', readingDeltaMin: 0, speedMultiplier: 1.0 },
  { id: 'faster', label: 'Faster (-5 Minutes ~ 1.1x)', readingDeltaMin: -5, speedMultiplier: 1.1 },
  { id: 'much_faster', label: 'Much Faster (-10 Minutes ~ 1.2x)', readingDeltaMin: -10, speedMultiplier: 1.2 },
];

function examTotalSeconds(skill: CambridgeSkill, pacingId: TimePacingId): number {
  const opt = TIME_PACING_OPTIONS.find((o) => o.id === pacingId) ?? TIME_PACING_OPTIONS[2]!;
  if (skill === 'reading') {
    return Math.max(10 * 60, (60 + opt.readingDeltaMin) * 60);
  }
  // Listening: 30 min audio scaled by speed + 2 min official CD-IELTS review time.
  const audioSec = Math.round((30 * 60) / opt.speedMultiplier);
  return audioSec + 2 * 60;
}

function asObj(v: unknown): Obj | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null;
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function collectQuestionNumbers(segment: Obj, fallbackPart: number): number[] {
  const rawRange = segment.questions;
  if (
    Array.isArray(rawRange) &&
    rawRange.length === 2 &&
    typeof rawRange[0] === 'number' &&
    typeof rawRange[1] === 'number' &&
    rawRange[1] >= rawRange[0] &&
    rawRange[1] - rawRange[0] < 80
  ) {
    const out: number[] = [];
    for (let n = rawRange[0]; n <= rawRange[1]; n += 1) out.push(n);
    return out;
  }
  const found = new Set<number>();
  const walk = (node: unknown, key?: string) => {
    if (key === 'pages' || key === 'page' || key === 'questions') return;
    if (typeof node === 'string') {
      for (const m of node.matchAll(/\{(\d+)\}/g)) {
        const n = Number(m[1]);
        if (Number.isFinite(n)) found.add(n);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item, key);
      return;
    }
    const o = asObj(node);
    if (!o) return;
    if (typeof o.number === 'number') found.add(Math.floor(o.number));
    for (const [k, v] of Object.entries(o)) walk(v, k);
  };
  walk(segment);
  if (found.size === 0) return [fallbackPart];
  return [...found].sort((a, b) => a - b);
}

function cambridgePartBanner(
  skill: CambridgeSkill,
  partNum: number,
  numbers: number[],
  segment: Obj
): string {
  switch (skill) {
    case 'listening':
      return 'listen and answer questions';
    case 'reading': {
      if (numbers.length === 0) return 'Read the text and answer the questions.';
      const range =
        numbers.length === 1
          ? `${numbers[0]}`
          : `${numbers[0]}-${numbers[numbers.length - 1]}`;
      return `Read the text and answer questions ${range}.`;
    }
    case 'writing': {
      const time = typeof segment.time === 'string' ? segment.time.trim() : '';
      const min = typeof segment.min_words === 'number' ? Math.floor(segment.min_words) : 0;
      const words = min > 0 ? `Write at least ${min} words.` : '';
      return [time, words].filter(Boolean).join(' ');
    }
    default: {
      const intro = typeof segment.intro === 'string' ? segment.intro.trim() : '';
      if (intro) return intro;
      const note = typeof segment.side_note === 'string' ? segment.side_note.trim() : '';
      if (note) return note;
      return `Part ${partNum}`;
    }
  }
}

function formatHms(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600) % 100;
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

type ToolKind =
  | 'Exit'
  | 'Pause'
  | 'Transcript'
  | 'AI History'
  | 'Comment'
  | 'Analysis'
  | 'Sample'
  | 'Report'
  | 'Setting';

function toolsForPractice(skill: CambridgeSkill): ToolKind[] {
  switch (skill) {
    case 'listening':
      return ['Exit', 'Transcript', 'Comment', 'Analysis', 'Report', 'Setting'];
    case 'writing':
      return ['Exit', 'Transcript', 'AI History', 'Comment', 'Sample', 'Report', 'Setting'];
    case 'speaking':
      return ['Exit', 'Comment', 'Sample', 'Report', 'Setting'];
    default:
      return ['Exit', 'Comment', 'Analysis', 'Report', 'Setting'];
  }
}

function ToolIcon({ kind }: { kind: ToolKind }) {
  switch (kind) {
    case 'Exit':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5M21 12H9" />
        </svg>
      );
    case 'Pause':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      );
    case 'Transcript':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M8 13h8M8 17h5" />
        </svg>
      );
    case 'AI History':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'Comment':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case 'Analysis':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v5" />
        </svg>
      );
    case 'Sample':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2" />
        </svg>
      );
    case 'Report':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M8 12h8M8 16h8M8 20h4" />
        </svg>
      );
    case 'Setting':
      return (
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
  }
}

/**
 * Cambridge IELTS Exam Desk supporting BOTH Testino modes for Reading & Listening:
 * - Practice Mode (`mode="practice"`): elapsed clock, full tools, Highlighter toggle,
 *   5-tool selection strip (Google, Dictionary, US/UK TTS, Highlight), full Listening AudioBar,
 *   per-question `✓ Answer` button, and live `Report`.
 * - Exam Mode (`mode="exam"`): official countdown timer (±5/±10 min Time Pacing),
 *   top bar restricted to Exit + Pause (+ Volume slider in Listening & Notes drawer),
 *   selection strip restricted to Note + Highlight only, per-question `✓ Answer` hidden,
 *   Listening audio auto-plays continuously without seek/speed bar, Pause overlay,
 *   auto-submit on time up, and official IELTS Band Score Report with `Review in Practice mode`.
 */
export function CambridgeExamClient({
  locale,
  bookId,
  bookParam,
  volume,
  userName,
  isSignedIn = false,
  section,
  initialAnswerKey,
  initialMode = null,
  initialServerState = null,
  translations = null,
  labels,
}: {
  locale: Locale;
  bookId: number;
  bookParam?: string;
  volume: string;
  userName: string;
  isSignedIn?: boolean;
  section: CambridgeSection;
  initialAnswerKey: KeyByNumber;
  initialMode?: ExamMode | null;
  initialServerState?: CambridgeUserState | null;
  translations?: CambridgeTranslationBundle | null;
  labels: CambridgeLabels;
}) {
  const { skill, test, slug, segments } = section;
  const isScorable = skill === 'listening' || skill === 'reading';

  // Hide site chrome while in the Cambridge exam desk.
  useEffect(() => {
    document.documentElement.setAttribute('data-cambridge-exam', 'true');
    return () => {
      document.documentElement.removeAttribute('data-cambridge-exam');
      stopSpeaking();
    };
  }, []);

  // Dual-mode state: Practice launches immediately; Exam (or unspecified on Reading/Listening) shows setup screen.
  const [mode, setMode] = useState<ExamMode>(
    isScorable ? (initialMode ?? 'practice') : 'practice'
  );
  const [pacing, setPacing] = useState<TimePacingId>('standard');
  const [started, setStarted] = useState<boolean>(
    !isScorable || initialMode === 'practice'
  );
  const [paused, setPaused] = useState(false);

  const isExamMode = isScorable && mode === 'exam';

  // Timer state: elapsed (Practice) vs countdown (Exam).
  const [elapsedSec, setElapsedSec] = useState(0);
  const [remainingSec, setRemainingSec] = useState(() =>
    initialServerState &&
    initialServerState.mode === 'exam' &&
    initialServerState.status === 'in_progress' &&
    initialServerState.remainingSec !== null &&
    initialServerState.remainingSec > 0
      ? initialServerState.remainingSec
      : examTotalSeconds(skill, 'standard')
  );
  const [examVolume, setExamVolume] = useState(50);
  const examAudioRef = useRef<HTMLAudioElement>(null);

  const [partIndex, setPartIndex] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>(() =>
    initialServerState ? { ...initialServerState.answers } : {}
  );
  const [flagged, setFlagged] = useState<Set<number>>(
    () => new Set(initialServerState?.flagged ?? [])
  );
  const [armedChip, setArmedChip] = useState<{ letter: string; from?: string } | null>(null);

  // Split-pane state & scroll refs.
  const [leftFraction, setLeftFraction] = useState(0.5);
  const splitRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const listeningPaneRef = useRef<HTMLDivElement>(null);
  const draggingSplit = useRef(false);

  // Speaking per-question recordings.
  const [recordings, setRecordings] = useState<Record<number, string>>({});

  // Highlighter & Notes drawer.
  const [highlighterOn, setHighlighterOn] = useState(false);
  const [highlights, setHighlights] = useState<HighlightEntry[]>(() =>
    initialServerState ? [...initialServerState.highlights] : []
  );
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);

  // Settings popover (text size) + Practice Mode translation & transcript/sample drawers.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [textSize, setTextSize] = useState<TextSizeMode>('standard');
  const [translationLang, setTranslationLang] = useState<CambridgeTranslationLang>('off');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);

  // Submission / finish / report state.
  const [submitting, setSubmitting] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [reportScore, setReportScore] = useState<CambridgeScore | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const autoSubmittedRef = useRef(false);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const elapsedRef = useRef(elapsedSec);
  useEffect(() => {
    elapsedRef.current = elapsedSec;
  }, [elapsedSec]);

  const remainingRef = useRef(remainingSec);
  useEffect(() => {
    remainingRef.current = remainingSec;
  }, [remainingSec]);

  // Debounced auto-save to `cambridge_state.php` for signed-in users (fails silently if offline/undeployed).
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (!isSignedIn || !started || reportScore) return;
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      void saveCambridgeStateAction({
        slug,
        test,
        skill,
        mode,
        answers,
        highlights,
        flagged: [...flagged],
        remainingSec: isExamMode ? remainingRef.current : null,
        status: 'in_progress',
      }).catch(() => {});
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [isSignedIn, started, reportScore, slug, test, skill, mode, isExamMode, answers, highlights, flagged]);

  // Immediate save whenever the user pauses Exam Mode so remaining countdown is preserved.
  useEffect(() => {
    if (!isSignedIn || !started || !paused || !isExamMode || reportScore) return;
    void saveCambridgeStateAction({
      slug,
      test,
      skill,
      mode,
      answers: answersRef.current,
      highlights,
      flagged: [...flagged],
      remainingSec: remainingRef.current,
      status: 'in_progress',
    }).catch(() => {});
  }, [isSignedIn, started, paused, isExamMode, reportScore, slug, test, skill, mode, highlights, flagged]);

  const submitExamAnswers = useCallback(async () => {
    if (submitting) return;
    setConfirmFinishOpen(false);
    setPaused(false);
    setSubmitting(true);
    setErrorToast(null);
    try {
      const result = await submitCambridgeAnswersAction({
        slug,
        bookId,
        test,
        skill,
        answers: answersRef.current,
        mode,
        durationSec: elapsedRef.current,
        timePacing: pacing,
      });
      if (result) {
        setReportScore(result);
      } else {
        setErrorToast(labels.couldNotLoad);
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, slug, bookId, test, skill, mode, pacing, labels.couldNotLoad]);

  // Clock tick: counts UP in Practice Mode, counts DOWN in Exam Mode (auto-submits at 0).
  useEffect(() => {
    if (!started || paused || reportScore) return;
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
      if (isExamMode) {
        setRemainingSec((r) => {
          if (r <= 1) {
            if (!autoSubmittedRef.current) {
              autoSubmittedRef.current = true;
              void submitExamAnswers();
            }
            return 0;
          }
          return r - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, paused, reportScore, isExamMode, submitExamAnswers]);

  // Reset pane scroll positions whenever switching Parts.
  useEffect(() => {
    if (leftPaneRef.current) leftPaneRef.current.scrollTop = 0;
    if (rightPaneRef.current) rightPaneRef.current.scrollTop = 0;
    if (listeningPaneRef.current) listeningPaneRef.current.scrollTop = 0;
  }, [partIndex]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingSplit.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const frac = (e.clientX - rect.left) / rect.width;
      setLeftFraction(Math.max(0.2, Math.min(0.8, frac)));
    };
    const onUp = () => {
      draggingSplit.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const speakingItems = useMemo(
    () => (skill === 'speaking' ? extractSpeakingItems(segments) : []),
    [skill, segments]
  );

  const parts = useMemo(
    () =>
      segments.map((seg, i) => {
        const part =
          (typeof seg.part === 'number' ? seg.part : null) ??
          (typeof seg.task === 'number' ? seg.task : null) ??
          (typeof seg.passage === 'number' ? seg.passage : null) ??
          i + 1;
        const numbers =
          skill === 'speaking'
            ? speakingItems.filter((it) => it.partIndex === i).map((it) => it.number)
            : collectQuestionNumbers(seg, part);
        return {
          index: i,
          part,
          numbers: numbers.length > 0 ? numbers : [part],
          segment: seg,
        };
      }),
    [segments, skill, speakingItems]
  );

  const activePart = parts[partIndex] ?? parts[0] ?? null;
  const activeSegment = activePart?.segment ?? null;

  const currentQuestion =
    activePart && activePart.numbers.length > 0
      ? activeQuestion !== null && activePart.numbers.includes(activeQuestion)
        ? activeQuestion
        : (activePart.numbers[0] ?? null)
      : activeQuestion;

  const activeAudioUrl =
    (activeSegment && typeof activeSegment.audio === 'string' && activeSegment.audio) ||
    section.audioUrl;

  // Sync Exam Mode hidden Listening audio volume, speed, and pause/resume.
  useEffect(() => {
    const el = examAudioRef.current;
    if (!el || !isExamMode || skill !== 'listening') return;
    const pacingOpt =
      TIME_PACING_OPTIONS.find((o) => o.id === pacing) ?? TIME_PACING_OPTIONS[2]!;
    el.volume = Math.max(0, Math.min(1, examVolume / 100));
    el.playbackRate = pacingOpt.speedMultiplier;
    if (paused || !started || reportScore) {
      el.pause();
    } else if (activeAudioUrl) {
      void el.play().catch(() => {});
    }
  }, [isExamMode, skill, examVolume, pacing, paused, started, reportScore, activeAudioUrl]);

  const backHref = localeHref(locale, `/books/${bookParam ?? bookId}/cambridge/${skill}`);
  const shortTitle = `Cambridge ${volume}-${test}`;
  const examTitle = userName ? `${userName} - ${shortTitle}` : shortTitle;

  const activeGroups = useMemo(
    () =>
      activeSegment
        ? asArr(activeSegment.groups)
            .map(asObj)
            .filter((g): g is Obj => g !== null)
        : [],
    [activeSegment]
  );
  const activePassage = useMemo(
    () => extractPassageObject(activeSegment),
    [activeSegment]
  );
  const headingSlots = useMemo(
    () => (skill === 'reading' ? extractHeadingSlots(activeGroups) : null),
    [skill, activeGroups]
  );

  const setAnswer = (qNum: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qNum]: value }));
  };

  function isAnswered(num: number): boolean {
    if (skill === 'speaking') return Boolean(recordings[num]);
    return (answers[String(num)] ?? '').trim().length > 0;
  }

  function selectQuestion(num: number) {
    const targetPart = parts.find((p) => p.numbers.includes(num));
    if (!targetPart) return;
    setPartIndex(targetPart.index);
    setActiveQuestion(num);
    window.setTimeout(() => {
      const el = document.getElementById(`cambridge-q-${num}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el?.querySelector<HTMLInputElement>('input');
      input?.focus({ preventScroll: true });
    }, 60);
  }

  function move(delta: -1 | 1) {
    const all = parts.flatMap((p) => p.numbers);
    if (all.length === 0) return;
    const idx = currentQuestion !== null ? all.indexOf(currentQuestion) : -1;
    const next = idx < 0 ? 0 : (idx + delta + all.length) % all.length;
    const target = all[next];
    if (target !== undefined) selectQuestion(target);
  }

  function toggleReview() {
    if (currentQuestion === null) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion)) next.delete(currentQuestion);
      else next.add(currentQuestion);
      return next;
    });
  }

  function launchMode(chosenMode: ExamMode) {
    setMode(chosenMode);
    setElapsedSec(0);
    const hasSavedExamTimer =
      chosenMode === 'exam' &&
      pacing === 'standard' &&
      initialServerState &&
      initialServerState.mode === 'exam' &&
      initialServerState.status === 'in_progress' &&
      initialServerState.remainingSec !== null &&
      initialServerState.remainingSec > 0;
    setRemainingSec(
      hasSavedExamTimer
        ? initialServerState.remainingSec!
        : examTotalSeconds(skill, pacing)
    );
    setPaused(false);
    autoSubmittedRef.current = false;
    setStarted(true);
  }

  const allQuestions = parts.flatMap((p) => p.numbers);
  const answeredTotal = allQuestions.filter((n) => isAnswered(n)).length;
  const unansweredTotal = Math.max(0, allQuestions.length - answeredTotal);

  /* ── 1. Testino-Style Mode & Time Pacing Setup Screen (Reading / Listening) ── */
  if (!started && isScorable) {
    const selectedPacing =
      TIME_PACING_OPTIONS.find((o) => o.id === pacing) ?? TIME_PACING_OPTIONS[2]!;
    const examMinPreview = Math.round(examTotalSeconds(skill, pacing) / 60);

    return (
      <div
        dir={locale === 'en' ? 'ltr' : 'rtl'}
        className="ielts-exam flex min-h-[100dvh] flex-col bg-[#F5F7FA] text-[#202327]"
      >
        <header
          dir="ltr"
          className="flex h-[64px] items-center justify-between border-b border-[#E5E7EB] bg-white px-4 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <span className="text-[18px] font-black text-[#077F83]">{shortTitle}</span>
            <span className="text-[#CBD5E1]">|</span>
            <span className="text-sm font-bold text-[#4F575E]">{labels[skill]}</span>
          </div>
          <Link
            href={backHref}
            className="rounded-[8px] border border-[#CBD5E1] bg-white px-3.5 py-1.5 text-xs font-bold text-[#202327] no-underline hover:bg-[#F1F2EB]"
          >
            {labels.exitTest}
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center p-4 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black text-[#202327]">
              <bdi lang="en">{shortTitle}</bdi> · {labels[skill]}
            </h1>
            <p className="mt-1 text-sm font-medium text-[#6B767F]">
              {allQuestions.length} questions · {parts.length}{' '}
              {skill === 'reading' ? labels.passagesUnit : labels.partsUnit}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Practice Mode Card */}
            <div className="flex flex-col justify-between rounded-[16px] border border-[#E5E7EB] bg-white p-6 shadow-xs">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#E7F6F4] px-3 py-1 text-xs font-extrabold text-[#077F83]">
                  <span>●</span>
                  <span>{labels.practiceMode}</span>
                </div>
                <p className="text-sm leading-relaxed text-[#4F575E]">
                  {labels.practiceModeDesc}
                </p>
                <ul
                  dir="ltr"
                  className="mt-4 space-y-1.5 text-left text-xs font-medium text-[#4F575E]"
                >
                  <li>✓ Stopwatch counting UP (no time limit)</li>
                  <li>✓ Per-question Answer check & Report anytime</li>
                  <li>✓ Dictionary, Google Translate, US/UK pronunciation & Highlighter</li>
                  {skill === 'listening' ? (
                    <li>✓ Full audio player (seek, ±5s, speed 0.4x–2x, download)</li>
                  ) : null}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => launchMode('practice')}
                className="mt-6 w-full cursor-pointer rounded-[10px] border-2 border-[#077F83] bg-white px-4 py-3 text-sm font-extrabold text-[#077F83] transition-colors hover:bg-[#077F83] hover:text-white"
              >
                {labels.startPracticeCta}
              </button>
            </div>

            {/* Exam Mode Card (with Testino's 5 Time Pacing Options) */}
            <div className="flex flex-col justify-between rounded-[16px] border-2 border-[#077F83] bg-white p-6 shadow-md">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#077F83] px-3 py-1 text-xs font-extrabold text-white">
                  <span>⏱</span>
                  <span>{labels.examMode}</span>
                </div>
                <p className="text-sm leading-relaxed text-[#4F575E]">
                  {labels.examModeDesc}
                </p>
                <ul
                  dir="ltr"
                  className="mt-4 space-y-1.5 text-left text-xs font-medium text-[#4F575E]"
                >
                  <li>
                    ✓ Countdown timer ({examMinPreview} min · {selectedPacing.label})
                  </li>
                  <li>✓ Official restricted tools: Exit, Pause & Notes only</li>
                  <li>✓ Highlight & Note only (no Dictionary / Translate / Answer key)</li>
                  {skill === 'listening' ? (
                    <li>✓ Real IELTS audio: plays continuously with volume slider only</li>
                  ) : null}
                </ul>

                {/* Time Pacing Dropdown (exact Testino 5 options) */}
                <div className="mt-4">
                  <label
                    htmlFor="ielts-time-pacing"
                    className="mb-1.5 block text-xs font-extrabold text-[#202327]"
                  >
                    {labels.timePacingLabel}
                  </label>
                  <select
                    id="ielts-time-pacing"
                    dir="ltr"
                    value={pacing}
                    onChange={(e) => setPacing(e.target.value as TimePacingId)}
                    className="h-10 w-full cursor-pointer rounded-[8px] border border-[#8E979F] bg-[#F8FAFC] px-3 text-xs font-bold text-[#202327] focus:border-[#077F83] focus:outline-none"
                  >
                    {TIME_PACING_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => launchMode('exam')}
                className="mt-6 w-full cursor-pointer rounded-[10px] bg-[#077F83] px-4 py-3 text-sm font-extrabold text-white shadow-xs transition-opacity hover:opacity-90"
              >
                {labels.startExamCta}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const writingKey = activePart ? String(activePart.part) : '1';
  const writingText = answers[writingKey] ?? '';
  const writingWordCount = countWords(writingText);
  const tools: ToolKind[] = isExamMode ? ['Exit', 'Pause'] : toolsForPractice(skill);
  const isLowExamTime = isExamMode && remainingSec <= 5 * 60 && remainingSec > 0;
  const hasTranslations = Boolean(translations?.available);
  const hasTranscript = skill === 'listening' && (translations?.audioscript.length ?? 0) > 0;
  const hasSampleWriting = skill === 'writing' && (translations?.sampleWriting.length ?? 0) > 0;
  const activePartNumber = activePart?.part ?? 1;
  const activeTranscriptItems = hasTranscript
    ? (translations?.audioscript ?? []).filter((it) => it.part === activePartNumber)
    : [];

  return (
    <CambridgeTranslationProvider
      lang={isExamMode ? 'off' : translationLang}
      byEn={translations?.byEn ?? null}
    >
    <div
      dir="ltr"
      lang="en"
      data-ielts-size={textSize}
      className="ielts-exam flex h-[100dvh] flex-col overflow-hidden bg-white font-['Open_Sans',var(--font-sans),sans-serif] text-[#202327]"
    >
      {/* Hidden continuous auto-play audio for Listening Exam Mode */}
      {isExamMode && skill === 'listening' && activeAudioUrl ? (
        <audio
          key={activeAudioUrl}
          ref={examAudioRef}
          src={activeAudioUrl}
          autoPlay
          onEnded={() => {
            if (partIndex < parts.length - 1) {
              setPartIndex((idx) => idx + 1);
            }
          }}
        />
      ) : null}

      {/* ── Top Bar (67px, exact Testino Practice vs Exam Mode layout) ── */}
      <header className="flex h-[67px] shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-2">
        <div className="flex min-w-0 flex-1 items-center">
          {/* Person Icon + Title + Clock (Elapsed in Practice / Countdown in Exam) */}
          <svg
            viewBox="0 0 24 24"
            className="size-8 shrink-0 text-[#202327]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
          <div className="ms-3 min-w-0 max-w-[145px] shrink sm:ms-4 sm:max-w-[215px]">
            <p className="truncate text-[13px] leading-5 font-bold text-[#202327] sm:text-[16px] sm:leading-6">
              {examTitle}
            </p>
            <p
              className={cn(
                'text-[14px] leading-5 tabular-nums',
                isLowExamTime ? 'animate-pulse font-bold text-[#DC2626]' : 'text-[#202327]'
              )}
            >
              {isExamMode ? formatHms(remainingSec) : formatHms(elapsedSec)}
            </p>
          </div>

          {/* Listening Exam Mode: Speaker + Volume Slider ONLY (no audio bar!) */}
          {isExamMode && skill === 'listening' ? (
            <div className="ms-3 flex shrink-0 items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1">
              <svg
                viewBox="0 0 24 24"
                className="size-4 text-[#202327]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              <input
                type="range"
                min={0}
                max={100}
                value={examVolume}
                onChange={(e) => setExamVolume(Number(e.target.value))}
                aria-label="Exam audio volume"
                className="h-1.5 w-20 cursor-pointer accent-[#077F83] sm:w-24"
              />
            </div>
          ) : null}

          {/* Circular Tool Buttons (+ Highlighter switch in Practice Mode only) */}
          <div className="ms-2 flex min-w-0 flex-1 items-center gap-3 overflow-x-auto px-2 sm:ms-4 sm:gap-5 lg:ms-8 lg:gap-6">
            {tools.map((tool) => {
              const isExit = tool === 'Exit';
              const isPause = tool === 'Pause';
              const isReport = tool === 'Report' && isScorable;
              const isSetting = tool === 'Setting';
              const isTranscriptBtn = tool === 'Transcript' && hasTranscript;
              const isSampleBtn = tool === 'Sample' && hasSampleWriting;
              const isActiveDrawer =
                (isTranscriptBtn && transcriptOpen) || (isSampleBtn && sampleOpen);
              const enabled =
                isExit || isPause || isReport || isSetting || isTranscriptBtn || isSampleBtn;

              const inner = (
                <span className="flex flex-col items-center">
                  <span
                    className={cn(
                      'grid size-[38px] place-items-center rounded-full border border-[#8E979F] bg-[#F1F2EB] text-[#202327] transition-colors',
                      enabled && 'group-hover:bg-[#4F575E] group-hover:text-white',
                      isActiveDrawer && 'border-[#077F83] bg-[#077F83] text-white'
                    )}
                  >
                    <ToolIcon kind={tool} />
                  </span>
                  <span className="hidden text-[11.5px] leading-4 text-[#202327] sm:block">
                    {tool}
                  </span>
                </span>
              );

              if (isExit) {
                return (
                  <Link
                    key={tool}
                    href={backHref}
                    className="group shrink-0 no-underline"
                    title="Exit"
                  >
                    {inner}
                  </Link>
                );
              }

              if (isPause) {
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setPaused(true)}
                    className="group shrink-0 cursor-pointer"
                    title="Pause"
                  >
                    {inner}
                  </button>
                );
              }

              if (isTranscriptBtn) {
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setTranscriptOpen((o) => !o)}
                    className="group shrink-0 cursor-pointer"
                    title="Audioscript"
                  >
                    {inner}
                  </button>
                );
              }

              if (isSampleBtn) {
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setSampleOpen((o) => !o)}
                    className="group shrink-0 cursor-pointer"
                    title="Sample Writing Answers"
                  >
                    {inner}
                  </button>
                );
              }

              if (isReport) {
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => void submitExamAnswers()}
                    className="group shrink-0 cursor-pointer"
                    title="Report"
                  >
                    {inner}
                  </button>
                );
              }

              if (isSetting) {
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setSettingsOpen((o) => !o)}
                    className="group shrink-0 cursor-pointer"
                    title="Setting"
                  >
                    {inner}
                  </button>
                );
              }

              return (
                <span
                  key={tool}
                  aria-disabled="true"
                  className="shrink-0 cursor-not-allowed opacity-40 select-none"
                >
                  {inner}
                </span>
              );
            })}

            {/* Highlighter Toggle Switch — Practice Mode ONLY */}
            {!isExamMode ? (
              <button
                type="button"
                role="switch"
                aria-checked={highlighterOn}
                onClick={() => setHighlighterOn((v) => !v)}
                className="flex shrink-0 cursor-pointer items-center gap-2"
              >
                <span
                  className={cn(
                    'flex h-[24px] w-[46px] items-center rounded-[16px] p-[2px] transition-colors duration-300',
                    highlighterOn ? 'justify-end bg-[#5CC3BE]' : 'justify-start bg-[#E4E4E4]'
                  )}
                >
                  <span className="size-[20px] rounded-full bg-white shadow-xs" />
                </span>
                <span className="text-[16px] font-normal text-[#33383D]">Highlighter</span>
              </button>
            ) : null}

            {/* Practice Mode Persian / Kurdish Translation Switch (desktop top bar; mobile/tablet sits below Part banner) */}
            {!isExamMode && hasTranslations ? (
              <div
                role="group"
                aria-label="Translation language"
                className="hidden shrink-0 items-center rounded-full border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 text-[12px] font-bold xl:inline-flex"
              >
                {(
                  [
                    ['off', 'EN'],
                    ['fa', 'فارسی'],
                    ['ckb', 'کوردی'],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setTranslationLang(code)}
                    className={cn(
                      'cursor-pointer rounded-full px-2.5 py-1 transition-colors',
                      translationLang === code
                        ? 'bg-[#077F83] text-white shadow-xs'
                        : 'text-[#4F575E] hover:text-[#202327]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Corner Icons: Notes drawer (in Exam Mode), Wi-Fi, Bell, Hamburger */}
        <div className="hidden shrink-0 items-center gap-1.5 pe-3 xl:pe-10 sm:flex">
          {isExamMode ? (
            <button
              type="button"
              onClick={() => setNotesDrawerOpen((o) => !o)}
              aria-label="Notes"
              title="Notes & Highlights"
              className={cn(
                'relative grid size-[40px] cursor-pointer place-items-center rounded-full text-[#202327] hover:bg-black/5',
                notesDrawerOpen && 'bg-[#E7F6F4] text-[#077F83]'
              )}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6M9 13h6M9 17h4" />
              </svg>
              {highlights.length > 0 ? (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-[#202327]">
                  {highlights.length}
                </span>
              ) : null}
            </button>
          ) : null}

          <span className="grid size-[40px] place-items-center text-[#202327]">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <path d="M12 20h.01" />
            </svg>
          </span>
          <span className="grid size-[40px] place-items-center text-[#202327]">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Exam menu"
            className="grid size-[40px] cursor-pointer place-items-center rounded-full text-[#202327] hover:bg-black/5"
          >
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings Popover (Text Size) */}
      {settingsOpen ? (
        <div className="fixed right-6 top-[72px] z-50 w-56 rounded-[12px] border border-[#E5E7EB] bg-white p-3.5 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#4F575E]">Text Size</span>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="cursor-pointer text-xs font-bold text-[#6B767F] hover:text-[#202327]"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ['standard', 'Normal'],
                ['large', 'Large'],
                ['xlarge', 'XL'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTextSize(val)}
                className={cn(
                  'cursor-pointer rounded border py-1.5 text-xs font-bold',
                  textSize === val
                    ? 'border-[#005FF0] bg-[#EFF6FF] text-[#005FF0]'
                    : 'border-[#E5E7EB] text-[#202327] hover:bg-[#F6F6F6]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Listening Audio Bar — Practice Mode ONLY (Exam Mode has NO seek bar!) ── */}
      {skill === 'listening' && !isExamMode ? (
        <CambridgeAudioBar url={activeAudioUrl} />
      ) : null}

      {/* ── Compact Warm Cream Part Banner (~50px) ── */}
      {activePart ? (
        <div className="mx-[10px] mt-[6px] shrink-0 rounded-[2px] border border-[#DD55DD]/35 bg-[#F1F2EB] px-[15px] py-[5px]">
          <p className="text-[15px] leading-5 font-bold text-[#202327]">Part {activePart.part}</p>
          <p className="text-[14.5px] leading-5 font-normal text-[#202327]">
            {cambridgePartBanner(skill, activePart.part, activePart.numbers, activePart.segment)}
          </p>
        </div>
      ) : null}

      {/* ── Mobile / Tablet Translation Toggle Bar (below Part banner, above Reading title) ── */}
      {!isExamMode && hasTranslations ? (
        <div className="mx-[10px] mt-[6px] flex shrink-0 items-center justify-between gap-2 rounded-[6px] border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1.5 xl:hidden">
          <span className="text-[12px] font-bold text-[#4F575E]">
            {locale === 'fa' ? 'ترجمه متن و سؤال‌ها' : locale === 'ckb' ? 'وەرگێڕان' : 'Translation'}
          </span>
          <div
            role="group"
            aria-label="Translation language"
            className="inline-flex shrink-0 items-center rounded-full border border-[#CBD5E1] bg-white p-0.5 text-[12px] font-bold"
          >
            {(
              [
                ['off', 'EN'],
                ['fa', 'فارسی'],
                ['ckb', 'کوردی'],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => setTranslationLang(code)}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1 transition-colors',
                  translationLang === code
                    ? 'bg-[#077F83] text-white shadow-xs'
                    : 'text-[#4F575E] hover:text-[#202327]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {errorToast ? (
        <div className="mx-[10px] mt-2 rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
          {errorToast}
        </div>
      ) : null}

      {/* ── Main Body + Optional Notes Slide-Over + Floating Black 55×55 ← / → Arrows ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden pt-2">
        {skill === 'reading' || skill === 'writing' ? (
          <>
            {/* Tablet/Desktop (>=700px) Side-by-Side Split Pane with `<|>` Handle */}
            <div
              ref={splitRef}
              className="relative hidden h-full w-full flex-1 overflow-hidden min-[700px]:flex"
            >
              {/* Left Pane: Passage (Reading) or Task Prompt (Writing) */}
              <div
                ref={leftPaneRef}
                style={{ width: `${leftFraction * 100}%` }}
                className="ielts-scroll h-full shrink-0 overflow-y-auto px-4 pt-2.5 pe-8 pb-40"
              >
                {skill === 'reading' && activePassage ? (
                  <HighlightableContainer
                    locale={locale}
                    mode={mode}
                    highlighterActive={highlighterOn}
                    onAddHighlight={(entry, openDrawer) => {
                      setHighlights((prev) => [...prev, entry]);
                      if (openDrawer) setNotesDrawerOpen(true);
                    }}
                  >
                    <ReadingPassageView
                      passage={activePassage}
                      partIndex={partIndex}
                      headingSlots={headingSlots}
                      answers={answers}
                      onAnswer={setAnswer}
                      onFocusQuestion={setActiveQuestion}
                      armedChip={armedChip}
                      onArmChip={setArmedChip}
                      highlights={highlights}
                      onRemoveHighlight={(id) =>
                        setHighlights((prev) => prev.filter((h) => h.id !== id))
                      }
                    />
                  </HighlightableContainer>
                ) : skill === 'writing' && activeSegment ? (
                  <WritingPromptView segment={activeSegment} />
                ) : null}
              </div>

              {/* Exact `<|>` Grip Handle on Pane Boundary */}
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize panes"
                onPointerDown={(e) => {
                  e.preventDefault();
                  draggingSplit.current = true;
                }}
                onDoubleClick={() => setLeftFraction(0.5)}
                style={{ left: `calc(${leftFraction * 100}% - 17px)` }}
                className="group absolute top-1/2 z-20 flex h-[33px] w-[34px] -translate-y-1/2 cursor-col-resize select-none items-center justify-center border-[1.6px] border-[#535353] bg-white text-[14px] leading-none font-bold text-[#535353] hover:border-[#1E40AF] hover:text-[#1E40AF]"
                title="Drag to resize · Double-click to reset"
              >
                &lt;|&gt;
              </div>

              {/* Right Pane: Questions (Reading) or Answer Box (Writing) */}
              {skill === 'writing' ? (
                <div
                  ref={rightPaneRef}
                  className="ielts-scroll flex h-full flex-1 flex-col overflow-y-auto pt-1.5 pe-4 ps-5 pb-16"
                >
                  <div className="mb-2 flex justify-end gap-2">
                    <span className="rounded-[6px] bg-[#E7F6F4] px-2.5 py-1.5 text-[12px] text-[#2F9B97] opacity-40 select-none">
                      Teacher correction
                    </span>
                    <span className="rounded-[6px] bg-[#E7F6F4] px-2.5 py-1.5 text-[12px] text-[#2F9B97] opacity-40 select-none">
                      AI correction
                    </span>
                  </div>
                  <textarea
                    value={writingText}
                    onChange={(e) => setAnswer(writingKey, e.target.value)}
                    spellCheck={false}
                    className="min-h-[280px] w-full resize-y rounded-[2px] border border-[#4F575E] bg-white p-3 text-[15px] leading-[1.45] text-[#202327] focus:border-[#005FF0] focus:outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#4F575E]">
                      Word count:{writingWordCount}
                    </span>
                    <span className="rounded-[6px] bg-[#E7F6F4] px-2.5 py-1.5 text-[12px] text-[#2F9B97] opacity-40 select-none">
                      Extra practice
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  ref={rightPaneRef}
                  className="ielts-scroll h-full flex-1 overflow-y-auto px-6 pt-2.5 pb-40"
                >
                  {activeGroups.map((grp, i) => (
                    <CambridgeGroupView
                      key={`${partIndex}-${i}`}
                      group={grp}
                      skill={skill}
                      answers={answers}
                      onAnswer={setAnswer}
                      answerKey={initialAnswerKey}
                      activeQuestion={currentQuestion}
                      onFocusQuestion={setActiveQuestion}
                      armedChip={armedChip}
                      onArmChip={setArmedChip}
                      hideAnswerControls={isExamMode}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile (<700px) Single Scroll List */}
            <div className="ielts-scroll h-full w-full overflow-y-auto px-4 pt-2 pb-44 min-[700px]:hidden">
              {skill === 'reading' && activePassage ? (
                <div className="mb-8 border-b border-[#E5E7EB] pb-6">
                  <HighlightableContainer
                    locale={locale}
                    mode={mode}
                    highlighterActive={highlighterOn}
                    onAddHighlight={(entry, openDrawer) => {
                      setHighlights((prev) => [...prev, entry]);
                      if (openDrawer) setNotesDrawerOpen(true);
                    }}
                  >
                    <ReadingPassageView
                      passage={activePassage}
                      partIndex={partIndex}
                      headingSlots={headingSlots}
                      answers={answers}
                      onAnswer={setAnswer}
                      onFocusQuestion={setActiveQuestion}
                      armedChip={armedChip}
                      onArmChip={setArmedChip}
                      highlights={highlights}
                      onRemoveHighlight={(id) =>
                        setHighlights((prev) => prev.filter((h) => h.id !== id))
                      }
                    />
                  </HighlightableContainer>
                </div>
              ) : null}

              {skill === 'writing' && activeSegment ? (
                <div className="space-y-4">
                  <WritingPromptView segment={activeSegment} />
                  <textarea
                    value={writingText}
                    onChange={(e) => setAnswer(writingKey, e.target.value)}
                    rows={12}
                    spellCheck={false}
                    className="w-full rounded-[2px] border border-[#4F575E] bg-white p-3 text-[15px] leading-[1.45] text-[#202327] focus:border-[#005FF0] focus:outline-none"
                  />
                  <p className="text-[13px] text-[#4F575E]">Word count:{writingWordCount}</p>
                </div>
              ) : null}

              {skill === 'reading'
                ? activeGroups.map((grp, i) => (
                    <CambridgeGroupView
                      key={`${partIndex}-${i}`}
                      group={grp}
                      skill={skill}
                      answers={answers}
                      onAnswer={setAnswer}
                      answerKey={initialAnswerKey}
                      activeQuestion={currentQuestion}
                      onFocusQuestion={setActiveQuestion}
                      armedChip={armedChip}
                      onArmChip={setArmedChip}
                      hideAnswerControls={isExamMode}
                    />
                  ))
                : null}
            </div>
          </>
        ) : skill === 'speaking' ? (
          <div className="ielts-scroll h-full w-full overflow-y-auto px-5 pt-3 pb-44 sm:px-8">
            <div className="mx-auto max-w-4xl">
              {(() => {
                const activeSpeakingItem =
                  speakingItems.find((it) => it.number === currentQuestion) ??
                  speakingItems.find((it) => it.partIndex === partIndex) ??
                  speakingItems[0];
                return activeSpeakingItem ? (
                  <SpeakingSegmentView
                    key={activeSpeakingItem.number}
                    item={activeSpeakingItem}
                    recordedUrl={recordings[activeSpeakingItem.number]}
                    onRecorded={(qNum, blobUrl) =>
                      setRecordings((prev) => ({ ...prev, [qNum]: blobUrl }))
                    }
                  />
                ) : null;
              })()}
            </div>
          </div>
        ) : (
          /* Listening: full-width left-aligned exam sheet */
          <div
            ref={listeningPaneRef}
            className="ielts-scroll h-full w-full overflow-y-auto px-5 pt-3 pb-44"
          >
            <div className="w-full max-w-[1280px]">
              {activeGroups.map((grp, i) => (
                <CambridgeGroupView
                  key={`${partIndex}-${i}`}
                  group={grp}
                  skill={skill}
                  answers={answers}
                  onAnswer={setAnswer}
                  answerKey={initialAnswerKey}
                  activeQuestion={currentQuestion}
                  onFocusQuestion={setActiveQuestion}
                  armedChip={armedChip}
                  onArmChip={setArmedChip}
                  hideAnswerControls={isExamMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* Practice Mode Bilingual Audioscript (Transcript) Slide-Over Drawer */}
        {transcriptOpen && !isExamMode && hasTranscript ? (
          <aside className="flex h-full w-80 shrink-0 flex-col border-s border-[#E5E7EB] bg-white shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <span className="text-xs font-extrabold uppercase text-[#077F83]">
                Audioscript · Part {activePartNumber}
              </span>
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                className="cursor-pointer text-xs font-bold text-[#6B767F] hover:text-[#202327]"
              >
                ✕
              </button>
            </div>
            <div className="ielts-scroll flex-1 space-y-3 overflow-y-auto p-4 text-[14px] leading-relaxed">
              {activeTranscriptItems.map((seg, idx) => {
                const tr =
                  translationLang === 'ckb'
                    ? seg.ckb
                    : translationLang === 'fa'
                      ? seg.fa
                      : undefined;
                return (
                  <div key={idx} className="space-y-1 border-b border-[#F1F5F9] pb-2.5 last:border-0">
                    {seg.speaker ? (
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#077F83]">
                        {seg.speaker}
                      </p>
                    ) : null}
                    <p className="text-[#202327]">{seg.en}</p>
                    {tr ? (
                      <p
                        dir="rtl"
                        lang={translationLang}
                        className="rounded-[6px] border-r-2 border-[#077F83]/60 bg-[#F0FAF9] px-2.5 py-1.5 text-right text-[13px] leading-[1.8] text-[#1E4E52]"
                      >
                        {tr}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </aside>
        ) : null}

        {/* Practice Mode Bilingual Sample Writing Slide-Over Drawer */}
        {sampleOpen && !isExamMode && hasSampleWriting ? (
          <aside className="flex h-full w-80 shrink-0 flex-col border-s border-[#E5E7EB] bg-white shadow-xl sm:w-[420px]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <span className="text-xs font-extrabold uppercase text-[#077F83]">
                Sample Writing & Examiner Comment
              </span>
              <button
                type="button"
                onClick={() => setSampleOpen(false)}
                className="cursor-pointer text-xs font-bold text-[#6B767F] hover:text-[#202327]"
              >
                ✕
              </button>
            </div>
            <div className="ielts-scroll flex-1 space-y-3 overflow-y-auto p-4 text-[14px] leading-relaxed">
              {(translations?.sampleWriting ?? []).map((item, idx) => {
                const tr =
                  translationLang === 'ckb'
                    ? item.ckb
                    : translationLang === 'fa'
                      ? item.fa
                      : undefined;
                const isBand = item.kind === 'band_text';
                const isComment = item.kind === 'examiner_comment';
                return (
                  <div
                    key={idx}
                    className={cn(
                      'space-y-1.5',
                      isBand && 'rounded-[8px] bg-[#E7F6F4] p-2.5 font-bold text-[#077F83]',
                      isComment && 'rounded-[8px] border border-amber-300 bg-amber-50 p-3 text-[#202327]'
                    )}
                  >
                    {isComment ? (
                      <p className="text-[11px] font-extrabold uppercase text-amber-800">
                        Examiner Comment
                      </p>
                    ) : null}
                    <p>{item.en}</p>
                    {tr ? (
                      <p
                        dir="rtl"
                        lang={translationLang}
                        className="rounded-[6px] border-r-2 border-[#077F83]/60 bg-white/90 px-2.5 py-1.5 text-right text-[13px] font-normal leading-[1.8] text-[#1E4E52]"
                      >
                        {tr}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </aside>
        ) : null}

        {/* Exam Mode Notes Slide-Over Drawer (mirrors Testino top-right Notes icon) */}
        {notesDrawerOpen && isExamMode ? (
          <aside className="flex h-full w-72 shrink-0 flex-col border-s border-[#E5E7EB] bg-white shadow-xl sm:w-80">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <span className="text-xs font-extrabold uppercase text-[#4F575E]">
                Notes & Highlights
              </span>
              <button
                type="button"
                onClick={() => setNotesDrawerOpen(false)}
                className="cursor-pointer text-xs font-bold text-[#6B767F] hover:text-[#202327]"
              >
                ✕
              </button>
            </div>
            <div className="ielts-scroll flex-1 space-y-2.5 overflow-y-auto p-3.5">
              {highlights.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#6B767F]">
                  Select text in the passage and click Note or Highlight.
                </p>
              ) : (
                highlights.map((h) => (
                  <div
                    key={h.id}
                    className="space-y-2 rounded-[6px] border border-[#E5E7EB] bg-[#FAFAFA] p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-[#FDE68A] px-1.5 py-0.5 text-[11px] font-medium text-[#202327] line-clamp-2">
                        “{h.quote}”
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setHighlights((prev) => prev.filter((x) => x.id !== h.id))
                        }
                        className="shrink-0 cursor-pointer text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={h.note ?? ''}
                      onChange={(e) =>
                        setHighlights((prev) =>
                          prev.map((x) =>
                            x.id === h.id ? { ...x, note: e.target.value } : x
                          )
                        )
                      }
                      placeholder="Write your note…"
                      className="w-full resize-none rounded border border-[#CBD5E1] bg-white p-1.5 text-xs text-[#202327] focus:border-[#077F83] focus:outline-none"
                    />
                  </div>
                ))
              )}
            </div>
          </aside>
        ) : null}

        {/* Floating Black 55×55 ← / → Step Arrows */}
        <div className="pointer-events-auto absolute right-6 bottom-[22px] z-20 flex items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous question"
            className="grid size-[55px] cursor-pointer place-items-center rounded-[6px] bg-[#202327] text-white shadow-md transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next question"
            className="grid size-[55px] cursor-pointer place-items-center rounded-[6px] bg-[#202327] text-white shadow-md transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Bottom Bar (55px) ── */}
      <footer className="flex h-[55px] shrink-0 items-center border-t border-[#E6E9EF] bg-white">
        {/* Left: Review Checkbox */}
        <div className="hidden shrink-0 items-center pe-6 ps-2 md:flex">
          <button
            type="button"
            onClick={toggleReview}
            disabled={currentQuestion === null}
            className="flex cursor-pointer items-center gap-1.5 text-[16px] text-[#202327] disabled:opacity-40"
          >
            <span
              className={cn(
                'grid size-[13px] place-items-center rounded-[2px] border text-[10px] font-bold leading-none',
                currentQuestion !== null && flagged.has(currentQuestion)
                  ? 'border-[#0075FF] bg-[#0075FF] text-white'
                  : 'border-[#767676] bg-white text-transparent'
              )}
            >
              ✓
            </span>
            <span>Review</span>
          </button>
        </div>

        {/* Center: Parts Strip */}
        <div className="flex h-full min-w-0 flex-1 items-center overflow-x-auto">
          {parts.map((p) => {
            const active = p.index === partIndex;
            const done = p.numbers.filter((n) => isAnswered(n)).length;
            const allDone = p.numbers.length > 0 && done === p.numbers.length;

            if (!active) {
              return (
                <button
                  key={p.index}
                  type="button"
                  onClick={() => {
                    setPartIndex(p.index);
                    if (p.numbers[0] !== undefined) setActiveQuestion(p.numbers[0]);
                  }}
                  className={cn(
                    'flex h-full min-w-[165px] flex-1 cursor-pointer items-center justify-center gap-4 border-t-[2.4px] px-4 text-[16px] text-[#202327] transition-colors hover:bg-[#EFEFEF]',
                    allDone ? 'border-t-[#15803D]' : 'border-t-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      allDone ? 'font-semibold text-[#15803D]' : 'font-normal'
                    )}
                  >
                    {allDone ? <span>✓</span> : null}
                    <span>Part {p.part}</span>
                  </span>
                  <span className="font-semibold text-[#6B767F] tabular-nums">
                    {done} of {p.numbers.length}
                  </span>
                </button>
              );
            }

            return (
              <div
                key={p.index}
                className="flex h-full shrink-0 items-center bg-white pe-4"
              >
                <span
                  className={cn(
                    'flex h-[37px] items-center gap-1 border-t-[2.4px] ps-4 pe-6 text-[16px] font-semibold',
                    allDone
                      ? 'border-[#15803D] text-[#15803D]'
                      : 'border-[#A7AEB4] text-[#202327]'
                  )}
                >
                  {allDone ? <span>✓</span> : null}
                  <span>Part {p.part}</span>
                </span>
                <div className="flex items-center gap-1">
                  {p.numbers.map((num) => {
                    const isCurrent = num === currentQuestion;
                    const isDone = isAnswered(num);
                    const isRev = flagged.has(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => selectQuestion(num)}
                        className={cn(
                          'flex h-[37px] min-w-[26px] cursor-pointer items-center justify-center border-t-[2.4px] px-0.5 text-[16px] leading-5 tabular-nums transition-colors',
                          isDone ? 'border-t-[#15803D]' : 'border-t-[#A7AEB4]'
                        )}
                      >
                        <span
                          className={cn(
                            'rounded-[2px] border-[1.6px] px-1',
                            isCurrent
                              ? 'border-[#005FF0] font-semibold text-[#202327]'
                              : isRev
                                ? 'rounded-full border-amber-500 font-semibold text-[#202327]'
                                : 'border-transparent font-normal text-[#202327] hover:border-[#93C5FD]'
                          )}
                        >
                          {num}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: 73×53 Finish Checkmark Button */}
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            if (isExamMode) setConfirmFinishOpen(true);
            else void submitExamAnswers();
          }}
          aria-label="Finish and check answers"
          className="grid h-[53px] w-[73px] shrink-0 cursor-pointer place-items-center bg-[#EFEFEF] text-[#202327] transition-colors duration-200 hover:bg-[#202327] hover:text-white disabled:opacity-50"
        >
          {submitting ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </footer>

      {/* ── Exam Mode Full-Screen Pause Overlay (exact Testino copy & behavior) ── */}
      {paused && isExamMode ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-white/92 p-4 backdrop-blur-[6px]"
        >
          <div className="w-full max-w-md space-y-5 rounded-[16px] border border-[#E5E7EB] bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#F1F2EB] text-[#202327]">
              <ToolIcon kind="Pause" />
            </div>
            <h2 className="text-xl font-extrabold text-[#202327]">Exam Paused</h2>
            <p className="text-sm text-[#4F575E]">{labels.examPausedMsg}</p>
            <p className="font-mono text-lg font-bold text-[#077F83] tabular-nums">
              {formatHms(remainingSec)} remaining
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href={backHref}
                className="rounded-[8px] border border-[#8E979F] bg-white px-4 py-2.5 text-xs font-bold text-[#202327] no-underline hover:bg-[#F1F2EB]"
              >
                {labels.saveAndQuit}
              </Link>
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="cursor-pointer rounded-[8px] bg-[#077F83] px-5 py-2.5 text-xs font-extrabold text-white hover:opacity-90"
              >
                {labels.resumeTest}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Exam Mode Finish Confirmation Modal ── */}
      {confirmFinishOpen && isExamMode ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-[#202327]/30 p-4 backdrop-blur-[4px]"
        >
          <div className="w-full max-w-md space-y-4 rounded-[16px] border border-[#E5E7EB] bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-extrabold text-[#202327]">
              Are you ready to finish and submit?
            </h2>
            <div className="grid grid-cols-3 gap-2 rounded-[10px] border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-center">
              <div>
                <p className="text-lg font-black text-[#15803D] tabular-nums">{answeredTotal}</p>
                <p className="text-[11px] font-bold text-[#6B767F]">Answered</p>
              </div>
              <div>
                <p className="text-lg font-black text-[#DC2626] tabular-nums">{unansweredTotal}</p>
                <p className="text-[11px] font-bold text-[#6B767F]">Unanswered</p>
              </div>
              <div>
                <p className="text-lg font-black text-amber-600 tabular-nums">{flagged.size}</p>
                <p className="text-[11px] font-bold text-[#6B767F]">Review</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmFinishOpen(false)}
                className="cursor-pointer rounded-[8px] border border-[#CBD5E1] px-4 py-2 text-xs font-bold text-[#202327] hover:bg-[#F1F2EB]"
              >
                Return to exam
              </button>
              <button
                type="button"
                onClick={() => void submitExamAnswers()}
                className="cursor-pointer rounded-[8px] bg-[#077F83] px-4 py-2 text-xs font-extrabold text-white hover:opacity-90"
              >
                Finish & View Result
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Blurred Official Report & Band Score Dialog ── */}
      {reportScore ? (
        <CambridgeReportDialog
          title={shortTitle}
          skill={skill}
          score={reportScore}
          mode={mode}
          reviewCtaLabel={labels.switchToReview}
          onClose={() => setReportScore(null)}
          onOpenQuestion={(num) => selectQuestion(num)}
          onSwitchToPractice={
            isExamMode
              ? () => {
                  setReportScore(null);
                  setMode('practice');
                  setPaused(false);
                }
              : undefined
          }
        />
      ) : null}
    </div>
    </CambridgeTranslationProvider>
  );
}
