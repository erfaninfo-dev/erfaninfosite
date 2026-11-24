'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  HighlightableText,
  type HighlightEntry,
} from '@/components/features/cambridge/cambridge-highlighter';
import { CambridgeTranslationLine } from '@/components/features/cambridge/cambridge-translation-context';
import { SpeakButton } from '@/components/features/speaking/speak-button';
import { cn } from '@/lib/cn';
import type { CambridgeKeyedAnswer } from '@/lib/cambridge/api';
import type { CambridgeSkill } from '@/lib/cambridge/labels';

export type AnswerMap = Record<string, string>;
export type KeyByNumber = Record<string, CambridgeKeyedAnswer>;

export type BlockInteractionProps = {
  skill: CambridgeSkill;
  answers: AnswerMap;
  onAnswer: (num: string, value: string) => void;
  answerKey: KeyByNumber;
  activeQuestion: number | null;
  onFocusQuestion: (num: number) => void;
  armedChip: { letter: string; from?: string } | null;
  onArmChip: (chip: { letter: string; from?: string } | null) => void;
  /** True in Exam Mode: hides per-question `✓ Answer` and `Analysis` buttons (exact Testino behavior). */
  hideAnswerControls?: boolean;
  /** Question numbers that have Reading Analysis available (Practice Mode only). */
  analysisQuestions?: ReadonlySet<number>;
  /** Opens the Reading Analysis dialog scrolled directly to `qNum`. */
  onOpenAnalysis?: (qNum: number) => void;
};

type Obj = Record<string, unknown>;

function asObj(v: unknown): Obj | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null;
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : null;
}

function plainText(value: string): string {
  return value.replace(/\*\*/g, '').replace(/\*/g, '');
}

function answerMatchesKey(key: CambridgeKeyedAnswer | undefined, given: string): boolean {
  if (!key) return false;
  const g = given.trim().toLowerCase();
  if (!g) return false;
  const candidates = (key.raw || key.answer)
    .split('/')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (candidates.includes(g)) return true;
  if (key.answer.trim().toLowerCase() === g) return true;
  return false;
}

function formatAnswerBadge(label: string): string {
  const tokens = label
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => t.length === 1)) {
    return [...tokens].sort().join('');
  }
  return label;
}

/** Extracts the passage object from `segment.passage_content ?? segment.passage`. */
export function extractPassageObject(segment: Obj | null): Obj | null {
  if (!segment) return null;
  return asObj(segment.passage_content) ?? asObj(segment.passage);
}

/**
 * Mirrors Flutter's `_HeadingSlots.of(groups)`: maps passage paragraph labels
 * ("A" → "14") and heading numerals ("iii" → heading text) so drop boxes render
 * directly above each labeled section in the Reading Passage.
 */
export type HeadingSlots = {
  byLabel: Record<string, string>;
  headings: Record<string, string>;
};

export function extractHeadingSlots(groups: Obj[]): HeadingSlots | null {
  for (const group of groups) {
    const blocks = asArr(group.blocks)
      .map(asObj)
      .filter((b): b is Obj => b !== null);
    for (const block of blocks) {
      if (asStr(block.type) !== 'matching_headings') continue;
      const byLabel: Record<string, string> = {};
      for (const item of asArr(block.items).map(asObj).filter((x): x is Obj => x !== null)) {
        const m = asStr(item.text).match(/([A-Z])\s*$/);
        const num = asNum(item.number);
        if (m?.[1] && num !== null) byLabel[m[1]] = String(num);
      }
      const headings: Record<string, string> = {};
      for (const opt of asArr(block.options).map(asObj).filter((x): x is Obj => x !== null)) {
        const ltr = asStr(opt.letter);
        if (ltr) headings[ltr] = plainText(asStr(opt.text));
      }
      return { byLabel, headings };
    }
  }
  return null;
}

/** Renders inline **bold** and *italic* markdown used in Cambridge passages & prompts. */
export function FormattedText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-bold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(token);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Mirrors Flutter's `_examWording` — turns paper instructions into on-screen IELTS wording. */
function examWording(lines: string[], firstBlock: Obj | null, listening: boolean): string[] {
  const type = firstBlock ? asStr(firstBlock.type) : '';
  if (type === 'matching_headings') {
    return ['Choose the correct heading for each section and move it into the gap.'];
  }
  const dragged = listening && type === 'matching' && firstBlock?.options_may_be_reused !== true;
  const wordList = Array.isArray(firstBlock?.word_box);
  const letterLine = /(write|choose) .*(correct (letter|number)|answers from the box)/i;

  const out: string[] = [];
  for (const raw of lines) {
    let line = raw.trim();
    if (/^Label the \w+ below\.$/.test(line)) continue;
    if (/^(Reading Passage \d+ has|Look at the following)/.test(line)) continue;
    if (wordList && line.startsWith('Complete the summary using the list')) {
      out.push('Choose the correct letter and write them in each gap.');
      continue;
    }
    if (
      letterLine.test(line) &&
      (line.includes('next to') || line.includes('answer sheet') || line.includes('from the box'))
    ) {
      if (
        !dragged &&
        !wordList &&
        type !== 'paragraph_matching' &&
        !out.some((l) => l.startsWith('Choose '))
      ) {
        out.push('Choose the correct answer.');
      }
      continue;
    }
    if (line.includes('answer sheet')) continue;
    line = line
      .replace(/^Choose the correct letter, .*$/, 'Choose the correct answer.')
      .replace(/^Choose (\*\*[A-Z]+\*\*) letters, .*$/, 'Choose $1 correct answers.')
      .replace(
        /^Choose (.+) from the passage for each answer\.$/,
        'Write $1 from the passage in each gap.'
      );
    if (listening) line = line.replaceAll('for each answer', 'in each gap');
    if (!out.includes(line)) out.push(line);
  }
  if (dragged) {
    out.unshift('Choose the correct answer and move it into the gap.');
  }
  return out;
}

function isLegendOnly(blocks: Obj[]): boolean {
  if (blocks.length !== 1) return false;
  const t = asStr(blocks[0]?.type);
  return t === 'true_false_not_given' || t === 'yes_no_not_given';
}

function isShortHeading(value: string): boolean {
  const p = plainText(value).trim();
  if (!p || p.includes('{')) return false;
  if (p.startsWith('–') || p.startsWith('-') || p.startsWith('•')) return false;
  return p.length <= 28 && !p.endsWith('.');
}

/* ── Inline 144×24 Blank Field (mirrors `_BlankField`) ───────────────────── */

function GapText({
  text,
  answers,
  onAnswer,
  activeQuestion,
  onFocusQuestion,
  armedChip,
  onArmChip,
  boldShortLines = true,
}: BlockInteractionProps & {
  text: string;
  boldShortLines?: boolean;
}) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((rawLine, lineIdx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) return null;
        const isBoldLine = boldShortLines && isShortHeading(trimmed);
        const nodes: ReactNode[] = [];
        const regex = /\{(\d+)\}/g;
        let last = 0;
        let match: RegExpExecArray | null;
        let idx = 0;

        while ((match = regex.exec(trimmed)) !== null) {
          if (match.index > last) {
            nodes.push(<FormattedText key={`t-${idx++}`} text={trimmed.slice(last, match.index)} />);
          }
          const qNum = match[1]!;
          const qInt = Number(qNum);
          const val = answers[qNum] ?? '';
          const isFocused = activeQuestion === qInt;

          nodes.push(
            <span
              key={`g-${qNum}-${idx++}`}
              id={`cambridge-q-${qNum}`}
              className="relative mx-1 inline-flex h-[24px] w-[144px] items-center justify-center align-middle"
            >
              <input
                type="text"
                value={val}
                onFocus={() => onFocusQuestion(qInt)}
                onClick={() => {
                  onFocusQuestion(qInt);
                  if (armedChip) {
                    onAnswer(qNum, armedChip.letter);
                    onArmChip(null);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.getData('text/plain').trim();
                  if (dropped) {
                    onAnswer(qNum, dropped);
                    onFocusQuestion(qInt);
                  }
                }}
                onChange={(e) => onAnswer(qNum, e.target.value)}
                aria-label={`Question ${qNum}`}
                autoComplete="off"
                spellCheck={false}
                className={cn(
                  'h-[24px] w-full rounded-[3px] bg-white px-1.5 text-[14px] leading-5 font-normal text-[#202327] focus:outline-none',
                  isFocused
                    ? 'border-2 border-[#72A0FB]'
                    : 'border border-[#4F575E] focus:border-2 focus:border-[#72A0FB]'
                )}
              />
              {!val ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] font-bold text-[#202327]">
                  {qNum}
                </span>
              ) : null}
            </span>
          );
          last = match.index + match[0].length;
        }
        if (last < trimmed.length) {
          nodes.push(<FormattedText key={`t-${idx++}`} text={trimmed.slice(last)} />);
        }
        return (
          <span
            key={lineIdx}
            className={cn(
              lines.length > 1 ? 'mb-1.5 block last:mb-0' : 'inline',
              isBoldLine && 'font-bold'
            )}
          >
            {nodes}
          </span>
        );
      })}
      <CambridgeTranslationLine text={text} />
    </>
  );
}

/* ── Per-Question Teal "✓ Answer" + Dimmed "Analysis" Bar (mirrors `_AnswerCheck`) ── */

function AnswerCheckBar({
  qNum,
  given,
  answerKey,
  labelOverride,
  correctOverride,
  hasAnalysis = false,
  onOpenAnalysis,
}: {
  qNum: string;
  given: string;
  answerKey: KeyByNumber;
  labelOverride?: string | null;
  correctOverride?: boolean | null;
  hasAnalysis?: boolean;
  onOpenAnalysis?: (qNum: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const key = answerKey[qNum];
  const rawLabel = labelOverride ?? (key?.answer || key?.raw || '');
  const label = formatAnswerBadge(rawLabel);
  const correct = correctOverride ?? answerMatchesKey(key, given);
  const hasKey = Boolean(key || labelOverride);
  const qInt = Number(qNum);
  const canAnalyze = hasAnalysis && Boolean(onOpenAnalysis) && Number.isFinite(qInt) && qInt > 0;

  return (
    <div className="mt-2 flex flex-col items-start">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasKey}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 rounded-[2px] border border-[#077F83] px-2 py-0.5 text-[12px] leading-4 transition-colors disabled:cursor-default disabled:opacity-40',
            open ? 'bg-[#077F83] text-white' : 'bg-transparent text-[#077F83]'
          )}
        >
          <span>✓</span>
          <span>Answer</span>
        </button>

        {canAnalyze ? (
          <button
            type="button"
            onClick={() => onOpenAnalysis?.(qInt)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[2px] border border-[#077F83] bg-transparent px-2 py-0.5 text-[12px] leading-4 text-[#077F83] transition-colors hover:bg-[#077F83] hover:text-white"
          >
            <span>◔</span>
            <span>Analysis</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#077F83] px-2 py-0.5 text-[12px] leading-4 text-[#077F83] opacity-40 select-none">
            <span>◔</span>
            <span>Analysis</span>
          </span>
        )}
      </div>

      {open && label ? (
        <span
          className={cn(
            'mt-2 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-[10px] text-[12px] font-semibold',
            label.length === 1 ? 'px-0' : 'px-2',
            correct ? 'bg-[#15803D]/15 text-[#15803D]' : 'bg-[#DC2626]/15 text-[#DC2626]'
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

/* ── Flat Hoverable Option Row (mirrors `_OptionTick`) ───────────────────── */

function OptionTickRow({
  selected,
  label,
  radio,
  onClick,
}: {
  selected: boolean;
  label: string;
  radio: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mb-px flex min-h-[40px] w-full cursor-pointer items-center py-2 text-left text-[16px] leading-6 text-[#202327] transition-colors duration-200',
        selected ? 'bg-[#BBD8F0]' : 'bg-transparent hover:bg-[#DADDE0]'
      )}
    >
      <span className="flex shrink-0 items-center px-4">
        {radio ? (
          <span
            className={cn(
              'size-[13px] rounded-full bg-white',
              selected ? 'border-[3.5px] border-[#0075FF]' : 'border border-[#767676]'
            )}
          />
        ) : (
          <span
            className={cn(
              'grid size-[13px] place-items-center rounded-[2px] border text-[10px] font-bold leading-none',
              selected
                ? 'border-[#0075FF] bg-[#0075FF] text-white'
                : 'border-[#767676] bg-white text-transparent'
            )}
          >
            ✓
          </span>
        )}
      </span>
      <span className="flex-1 pe-3">
        <span className="block">{label}</span>
        <CambridgeTranslationLine text={label} className="mt-1 py-1 text-[13px]" />
      </span>
    </button>
  );
}

/* ── Reading Passage View (with Matching Heading Drop Boxes & Highlighter) ─ */

const CIRCLED_NUMS = [
  '①',
  '②',
  '③',
  '④',
  '⑤',
  '⑥',
  '⑦',
  '⑧',
  '⑨',
  '⑩',
  '⑪',
  '⑫',
  '⑬',
  '⑭',
  '⑮',
  '⑯',
  '⑰',
  '⑱',
  '⑲',
  '⑳',
] as const;

export function ReadingPassageView({
  passage,
  partIndex,
  headingSlots,
  answers,
  onAnswer,
  onFocusQuestion,
  armedChip,
  onArmChip,
  highlights,
  onRemoveHighlight,
  highlightedParagraphIndex = null,
}: {
  passage: Obj;
  partIndex: number;
  headingSlots: HeadingSlots | null;
  answers: AnswerMap;
  onAnswer: (num: string, value: string) => void;
  onFocusQuestion: (num: number) => void;
  armedChip: { letter: string; from?: string } | null;
  onArmChip: (chip: { letter: string; from?: string } | null) => void;
  highlights: HighlightEntry[];
  onRemoveHighlight: (id: string) => void;
  highlightedParagraphIndex?: number | null;
}) {
  const title = asStr(passage.title);
  const subtitle = asStr(passage.subtitle) || asStr(passage.intro);
  const paragraphs = asArr(passage.paragraphs);
  const footnotes = asArr(passage.footnotes);
  const hasLetterLabels = paragraphs.some((raw) => Boolean(asStr(asObj(raw)?.label)));

  return (
    <article dir="ltr" lang="en" className="ielts-prose pb-3 text-left text-[#202327]">
      {title ? (
        <div>
          <h2 className="text-[18px] leading-[1.4] font-bold text-[#202327]">
            <HighlightableText
              text={title}
              scopeKey={`p-${partIndex}-title`}
              highlights={highlights}
              onRemoveHighlight={onRemoveHighlight}
            />
          </h2>
          <CambridgeTranslationLine text={title} className="font-bold" />
        </div>
      ) : null}

      {subtitle ? (
        <div className="mt-1.5">
          <p className="text-[16px] leading-[1.5] font-bold italic text-[#202327]">
            <HighlightableText
              text={subtitle}
              scopeKey={`p-${partIndex}-sub`}
              highlights={highlights}
              onRemoveHighlight={onRemoveHighlight}
            />
          </p>
          <CambridgeTranslationLine text={subtitle} />
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {paragraphs.map((raw, i) => {
          const p = asObj(raw);
          const text = p ? asStr(p.text) : asStr(raw);
          const label = p ? asStr(p.label) : '';
          if (!text) return null;

          const headingNum = label && headingSlots ? headingSlots.byLabel[label] : undefined;
          const placedLetter = headingNum ? answers[headingNum] ?? '' : '';
          const placedHeading =
            placedLetter && headingSlots ? headingSlots.headings[placedLetter] : undefined;
          const circled = !hasLetterLabels ? (CIRCLED_NUMS[i] ?? `(${i + 1})`) : '';

          return (
            <div
              key={i}
              id={`cambridge-p-${partIndex}-${i}`}
              className={cn(
                'space-y-4 rounded-[8px] transition-colors duration-500',
                highlightedParagraphIndex === i &&
                  '-mx-2.5 bg-[#DCFCE7]/80 px-2.5 py-2 ring-2 ring-[#22C55E]/60'
              )}
            >
              {headingNum ? (
                <div
                  id={`cambridge-q-${headingNum}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const rawData = e.dataTransfer.getData('text/plain');
                    const [ltr, from] = rawData.split('|');
                    if (!ltr) return;
                    if (from && from !== headingNum) onAnswer(from, '');
                    onAnswer(headingNum, ltr);
                    onFocusQuestion(Number(headingNum));
                  }}
                  onClick={() => {
                    onFocusQuestion(Number(headingNum));
                    if (placedLetter && placedHeading) {
                      onAnswer(headingNum, '');
                    } else if (armedChip) {
                      if (armedChip.from && armedChip.from !== headingNum) {
                        onAnswer(armedChip.from, '');
                      }
                      onAnswer(headingNum, armedChip.letter);
                      onArmChip(null);
                    }
                  }}
                  className={cn(
                    'flex h-[30px] max-w-[540px] cursor-pointer items-center rounded-[6px] border border-dashed bg-white px-2 transition-colors',
                    armedChip && !placedLetter
                      ? 'border-[#0EA5E9] bg-[#EFF6FF]'
                      : 'border-[#8E979F] hover:border-[#0EA5E9]'
                  )}
                >
                  {placedLetter && placedHeading ? (
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', `${placedLetter}|${headingNum}`);
                      }}
                      className="truncate text-[16px] font-bold text-[#202327]"
                    >
                      {placedLetter} {placedHeading}
                    </span>
                  ) : (
                    <span className="w-full text-center text-[16px] font-bold text-[#202327]">
                      {headingNum}
                    </span>
                  )}
                </div>
              ) : null}

              <p className="text-[16px] leading-[1.55] text-[#202327]">
                {label ? (
                  <strong className="me-1.5 font-bold">{label}</strong>
                ) : circled ? (
                  <span className="me-1.5 text-[15px] font-semibold text-[#4F575E]">
                    {circled}
                  </span>
                ) : null}
                <HighlightableText
                  text={text}
                  scopeKey={`p-${partIndex}-${i}`}
                  highlights={highlights}
                  onRemoveHighlight={onRemoveHighlight}
                />
              </p>
              <CambridgeTranslationLine text={text} block />
            </div>
          );
        })}
      </div>

      {footnotes.length > 0 ? (
        <div className="mt-6 space-y-1 border-t border-[#E5E7EB] pt-3 text-[13px] text-[#4F575E]">
          {footnotes.map((fn, i) => (
            <div key={i}>
              <p>
                <FormattedText text={asStr(fn)} />
              </p>
              <CambridgeTranslationLine text={asStr(fn)} className="text-[12.5px]" />
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/* ── Question Group & All 12 Block Renderers ─────────────────────────────── */

export function CambridgeGroupView({
  group,
  ...interaction
}: BlockInteractionProps & {
  group: Obj;
}) {
  const qRange = asArr(group.questions);
  const heading =
    qRange.length === 2 && typeof qRange[0] === 'number' && typeof qRange[1] === 'number'
      ? `Questions ${qRange[0]}-${qRange[1]}`
      : null;
  const blocks = asArr(group.blocks)
    .map(asObj)
    .filter((b): b is Obj => b !== null);
  const rawInstructions = asArr(group.instructions).map(asStr).filter(Boolean);
  const instructions =
    rawInstructions.length > 0 && !isLegendOnly(blocks)
      ? examWording(rawInstructions, blocks[0] ?? null, interaction.skill === 'listening')
      : [];

  return (
    <section dir="ltr" lang="en" className="ielts-prose pb-4 text-left text-[#202327]">
      {heading ? (
        <h3 className="mb-4 text-[16px] leading-6 font-bold text-[#202327]">{heading}</h3>
      ) : null}

      {instructions.length > 0 ? (
        <div className="mb-4 space-y-1 text-[16px] leading-6 text-[#202327]">
          {instructions.map((line, i) => (
            <div key={i}>
              <p>
                <FormattedText text={line} />
              </p>
              <CambridgeTranslationLine text={rawInstructions[i] ?? line} />
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {blocks.map((block, i) => (
          <CambridgeBlockView key={i} block={block} {...interaction} />
        ))}
      </div>
    </section>
  );
}

function CambridgeBlockView({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const type = asStr(block.type);
  const isListening = interaction.skill === 'listening';

  switch (type) {
    case 'form':
    case 'notes':
      return <NotesFormBlock block={block} {...interaction} />;
    case 'table':
      return <TableBlock block={block} {...interaction} />;
    case 'summary':
    case 'sentence_completion':
      return <SummaryBlock block={block} {...interaction} />;
    case 'multiple_choice':
      return <SingleChoicesBlock block={block} {...interaction} />;
    case 'multiple_choice_multi':
      return <MultiChoiceBlock block={block} {...interaction} />;
    case 'matching':
      return isListening ? (
        <DragMatchBlock block={block} {...interaction} />
      ) : (
        <MatchingChoicesBlock block={block} {...interaction} />
      );
    case 'matching_headings':
      return <HeadingListBlock block={block} {...interaction} />;
    case 'paragraph_matching':
      return <LetterMatrixBlock block={block} {...interaction} />;
    case 'map_labelling':
      return <MapBlock block={block} {...interaction} />;
    case 'true_false_not_given':
    case 'yes_no_not_given':
      return <LegendChoicesBlock block={block} {...interaction} />;
    case 'short_answer':
      return <ShortAnswerBlock block={block} {...interaction} />;
    case 'diagram_labelling':
      return <DiagramLabellingBlock block={block} {...interaction} />;
    case 'flow_chart':
    case 'flowchart':
      return <FlowChartBlock block={block} {...interaction} />;
    default:
      return null;
  }
}

/* ── 1. Notes / Form (mirrors `_NotesForm`) ──────────────────────────────── */

function NotesFormBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const title = asStr(block.title);
  const items = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);
  const compact = interaction.skill === 'listening';

  return (
    <div>
      {title ? (
        <h4 className="mb-4 text-left text-[19px] leading-[1.4] font-bold text-[#202327]">
          {plainText(title)}
        </h4>
      ) : null}

      <div className={compact ? 'space-y-1.5' : 'space-y-5'}>
        {items.map((item, i) => {
          const kind = asStr(item.kind) || 'text';
          const text = asStr(item.text);
          const label = asStr(item.label);
          const example = item.example === true;
          const indent = (asNum(item.indent) ?? 0) * 16;
          const isHeading = kind === 'heading' || kind === 'subheading';

          if (kind === 'row' && compact) {
            return (
              <div
                key={i}
                style={{ paddingLeft: indent }}
                className={cn(
                  'text-[16px] leading-6 text-[#202327]',
                  example && 'text-[#6B767F] italic'
                )}
              >
                {label ? <strong className="me-1 font-bold">{plainText(label)}</strong> : null}
                <GapText text={text} boldShortLines={false} {...interaction} />
              </div>
            );
          }

          if (kind === 'row') {
            return (
              <div
                key={i}
                style={{ paddingLeft: indent }}
                className="flex flex-col gap-1 sm:flex-row sm:items-start"
              >
                <span className="w-[120px] shrink-0 text-[16px] leading-6 font-bold text-[#202327]">
                  {plainText(label)}
                </span>
                <div className="flex-1 text-[16px] leading-6 text-[#202327]">
                  <GapText text={text} {...interaction} />
                </div>
              </div>
            );
          }

          const prefix =
            kind === 'bullet' ? '• ' : kind === 'dash' ? (compact ? '- ' : '– ') : '';

          return (
            <div
              key={i}
              style={{ paddingLeft: indent }}
              className={cn(
                'flex items-start text-[#202327]',
                kind === 'subheading' && !compact
                  ? 'text-[20px] leading-[1.4] font-bold'
                  : 'text-[16px] leading-6',
                isHeading && 'font-bold',
                example && 'text-[#6B767F] italic'
              )}
            >
              {prefix ? <span className="shrink-0 whitespace-pre">{prefix}</span> : null}
              <div className="flex-1">
                <GapText text={text} boldShortLines={!compact} {...interaction} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 2. Table (mirrors `_TableBlock`) ────────────────────────────────────── */

function TableBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const title = asStr(block.title);
  const header = asArr(block.header).map(asStr);
  const rows = asArr(block.rows).map((r) => asArr(r).map(asStr));
  const isListening = interaction.skill === 'listening';

  return (
    <div className="overflow-x-auto">
      {!isListening && title ? (
        <p className="mb-2 text-[14px] font-bold text-[#202327]">{title}</p>
      ) : null}

      {isListening && title ? (
        <div className="border border-b-0 border-[#202327] bg-[#CBCFD2] px-2.5 py-6 text-[16px] text-[#202327]">
          {plainText(title)}
        </div>
      ) : null}

      <table className="w-full border-collapse border border-[#202327] text-left text-[16px] leading-6 text-[#202327]">
        {header.some(Boolean) ? (
          <thead>
            <tr className={isListening ? 'bg-white' : 'bg-[#CBCFD2]'}>
              {header.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    'border border-[#202327] p-2.5 align-middle',
                    isListening ? 'font-normal' : 'font-semibold'
                  )}
                >
                  <GapText text={col} boldShortLines={false} {...interaction} />
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((cells, rIdx) => (
            <tr key={rIdx}>
              {cells.map((cell, cIdx) => (
                <td key={cIdx} className="border border-[#202327] p-2.5 align-middle">
                  <GapText text={cell} boldShortLines={false} {...interaction} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── 3. Summary / Sentence Completion (mirrors `_SummaryBlock`) ──────────── */

function SummaryBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const title = asStr(block.title);
  const paragraphs = asArr(block.paragraphs).map((p) => {
    const o = asObj(p);
    return o ? asStr(o.text) : asStr(p);
  });
  const items = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);
  const wordBox = asArr(block.word_box)
    .map(asObj)
    .filter((x): x is Obj => x !== null);

  return (
    <div className="space-y-2 text-[16px] leading-6 text-[#202327]">
      {title ? <h4 className="text-[20px] leading-[1.4] font-bold">{title}</h4> : null}

      {paragraphs.map((p, i) => (
        <p key={i} className="pt-1 leading-[1.9]">
          <GapText text={p} {...interaction} />
        </p>
      ))}

      {items.map((item, i) => (
        <p key={i} className="pt-1 leading-[1.9]">
          <GapText text={`${item.number ?? ''}. ${asStr(item.text)}`} {...interaction} />
        </p>
      ))}

      {wordBox.length > 0 ? (
        <div className="flex justify-center pt-4">
          <div className="flex flex-wrap border border-[#202327] bg-white">
            {wordBox.map((opt, i) => {
              const ltr = asStr(opt.letter);
              const isArmed = interaction.armedChip?.letter === ltr;
              return (
                <button
                  key={i}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', ltr)}
                  onClick={() =>
                    interaction.onArmChip(isArmed ? null : { letter: ltr })
                  }
                  className={cn(
                    'cursor-grab px-4 py-1 text-[16px] leading-6 text-[#202327] transition-colors hover:bg-[#F1F2EB] active:cursor-grabbing',
                    isArmed && 'bg-[#BBD8F0] font-semibold'
                  )}
                >
                  {ltr}. {plainText(asStr(opt.text))}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── 4. Single Choice / Matching / TFNG (mirrors `_ChoiceQuestion`) ──────── */

function ChoiceQuestion({
  number,
  stem,
  options,
  selected,
  interaction,
}: {
  number: string;
  stem: string;
  options: Array<{ value: string; label: string }>;
  selected: string;
  plainStem?: boolean;
  interaction: BlockInteractionProps;
}) {
  const numInt = Number(number);

  return (
    <div id={`cambridge-q-${number}`} className="pb-6">
      <div className="pt-2 pb-3">
        <p className="text-[16px] leading-6 font-normal text-[#202327]">
          <span className="font-bold">{number} </span>
          <FormattedText text={stem} />
        </p>
        <CambridgeTranslationLine text={stem} />
      </div>

      <div>
        {options.map((opt) => (
          <OptionTickRow
            key={opt.value}
            selected={selected === opt.value}
            label={opt.label}
            radio
            onClick={() => {
              if (Number.isFinite(numInt)) interaction.onFocusQuestion(numInt);
              interaction.onAnswer(number, opt.value);
            }}
          />
        ))}
      </div>

      {!interaction.hideAnswerControls ? (
        <AnswerCheckBar
          qNum={number}
          given={selected}
          answerKey={interaction.answerKey}
          hasAnalysis={interaction.analysisQuestions?.has(numInt) ?? false}
          onOpenAnalysis={interaction.onOpenAnalysis}
        />
      ) : null}
    </div>
  );
}

function SingleChoicesBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const title = asStr(block.title);
  const questions = asArr(block.questions)
    .map(asObj)
    .filter((q): q is Obj => q !== null);

  return (
    <div>
      {title ? (
        <h4 className="mb-2 text-[20px] leading-[1.4] font-bold text-[#202327]">
          {plainText(title)}
        </h4>
      ) : null}
      {questions.map((q, i) => {
        const qKey = String(asNum(q.number) ?? i + 1);
        const options = asArr(q.options)
          .map(asObj)
          .filter((o): o is Obj => o !== null)
          .map((o) => ({
            value: asStr(o.letter),
            label: plainText(asStr(o.text)),
          }));
        return (
          <ChoiceQuestion
            key={qKey}
            number={qKey}
            stem={asStr(q.stem)}
            options={options}
            selected={interaction.answers[qKey] ?? ''}
            interaction={interaction}
          />
        );
      })}
    </div>
  );
}

/* ── 5. Multi-Select Choice (mirrors `_MultiChoice`) ─────────────────────── */

function MultiChoiceBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const numbers = asArr(block.numbers)
    .map(asNum)
    .filter((n): n is number => n !== null)
    .map(String);
  const choose = asNum(block.choose) ?? Math.max(2, numbers.length);
  const options = asArr(block.options)
    .map(asObj)
    .filter((o): o is Obj => o !== null);

  const selected = new Set(numbers.map((n) => interaction.answers[n] ?? '').filter(Boolean));
  const firstNum = numbers[0] ?? '';
  const firstKey = firstNum ? interaction.answerKey[firstNum] : undefined;
  const groupExpected = firstKey
    ? new Set(
        (firstKey.answer || firstKey.raw)
          .split('/')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      )
    : null;
  const givenUpper = new Set([...selected].map((s) => s.trim().toUpperCase()));
  const groupCorrect =
    groupExpected !== null
      ? givenUpper.size === groupExpected.size &&
        [...groupExpected].every((x) => givenUpper.has(x))
      : null;

  function toggle(letter: string) {
    if (firstNum) interaction.onFocusQuestion(Number(firstNum));
    const next = new Set(selected);
    if (next.has(letter)) {
      next.delete(letter);
    } else {
      if (next.size >= choose) return;
      next.add(letter);
    }
    const list = [...next];
    numbers.forEach((n, idx) => interaction.onAnswer(n, list[idx] ?? ''));
  }

  return (
    <div id={firstNum ? `cambridge-q-${firstNum}` : undefined} className="pb-6">
      <div className="pt-2 pb-3">
        <p className="text-[16px] leading-6 font-normal text-[#202327]">
          <span className="font-bold">
            {numbers.length >= 2 ? `${numbers[0]} - ${numbers[numbers.length - 1]}` : numbers.join()}{' '}
          </span>
          <FormattedText text={asStr(block.stem)} />
        </p>
        <CambridgeTranslationLine text={asStr(block.stem)} />
      </div>

      <div>
        {options.map((opt) => {
          const ltr = asStr(opt.letter);
          return (
            <OptionTickRow
              key={ltr}
              selected={selected.has(ltr)}
              label={plainText(asStr(opt.text))}
              radio={false}
              onClick={() => toggle(ltr)}
            />
          );
        })}
      </div>

      {!interaction.hideAnswerControls ? (
        <AnswerCheckBar
          qNum={firstNum}
          given={[...selected].join('')}
          answerKey={interaction.answerKey}
          labelOverride={firstKey ? firstKey.answer || firstKey.raw : null}
          correctOverride={groupCorrect}
          hasAnalysis={interaction.analysisQuestions?.has(Number(firstNum)) ?? false}
          onOpenAnalysis={interaction.onOpenAnalysis}
        />
      ) : null}
    </div>
  );
}

/* ── 6. Reading Matching Choices (mirrors `_MatchingBlock`) ──────────────── */

function MatchingChoicesBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const options = asArr(block.options)
    .map(asObj)
    .filter((o): o is Obj => o !== null)
    .map((o) => ({ value: asStr(o.letter), label: plainText(asStr(o.text)) }));
  const items = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);

  return (
    <div>
      {items.map((item, i) => {
        const qKey = String(asNum(item.number) ?? i + 1);
        return (
          <ChoiceQuestion
            key={qKey}
            number={qKey}
            stem={asStr(item.text)}
            options={options}
            selected={interaction.answers[qKey] ?? ''}
            plainStem
            interaction={interaction}
          />
        );
      })}
    </div>
  );
}

/* ── 7. Listening Drag-and-Drop Match (mirrors `_DragMatch`) ─────────────── */

function DragMatchBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const optionsEntries = asArr(block.options)
    .map(asObj)
    .filter((o): o is Obj => o !== null)
    .map((o) => ({ letter: asStr(o.letter), text: plainText(asStr(o.text)) }));
  const optionMap = Object.fromEntries(optionsEntries.map((o) => [o.letter, o.text]));
  const items = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);
  const reuse =
    block.options_may_be_reused === true ||
    (optionsEntries.length > 0 && optionsEntries.length < items.length);
  const numbers = items.map((it, i) => String(asNum(it.number) ?? i + 1));
  const used = new Set(numbers.map((n) => interaction.answers[n] ?? '').filter(Boolean));

  function place(targetNum: string, letter: string, from?: string) {
    if (from && from !== targetNum) interaction.onAnswer(from, '');
    if (!reuse) {
      for (const other of numbers) {
        if (other !== targetNum && interaction.answers[other] === letter) {
          interaction.onAnswer(other, '');
        }
      }
    }
    interaction.onAnswer(targetNum, letter);
    interaction.onFocusQuestion(Number(targetNum));
  }

  const itemsTitle = asStr(block.items_title);
  const optionsTitle = asStr(block.options_title);

  return (
    <div className="space-y-4">
      {itemsTitle ? (
        <h4 className="text-[20px] leading-[1.4] font-bold text-[#202327]">
          {plainText(itemsTitle)}
        </h4>
      ) : null}
      {optionsTitle ? (
        <p className="text-[16px] leading-6 text-[#202327]">{plainText(optionsTitle)}</p>
      ) : null}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-12">
        {/* Left: Numbered items with 180×30 dashed drop boxes */}
        <div className="space-y-3">
          {items.map((item, i) => {
            const qKey = String(asNum(item.number) ?? i + 1);
            const placed = interaction.answers[qKey] ?? '';
            const label = placed ? optionMap[placed] : undefined;

            return (
              <div
                key={qKey}
                id={`cambridge-q-${qKey}`}
                className="flex flex-wrap items-center gap-2 text-[16px] leading-6 text-[#202327]"
              >
                <span className="font-bold">{qKey}.</span>
                <span>{plainText(asStr(item.text))}</span>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const [ltr, from] = e.dataTransfer.getData('text/plain').split('|');
                    if (ltr) place(qKey, ltr, from);
                  }}
                  onClick={() => {
                    interaction.onFocusQuestion(Number(qKey));
                    if (placed) {
                      interaction.onAnswer(qKey, '');
                    } else if (interaction.armedChip) {
                      place(qKey, interaction.armedChip.letter, interaction.armedChip.from);
                      interaction.onArmChip(null);
                    }
                  }}
                  className={cn(
                    'flex h-[30px] w-[180px] cursor-pointer items-center rounded-[6px] border border-dashed bg-white px-2 text-[14px] transition-colors',
                    interaction.armedChip && !placed
                      ? 'border-[#93C5FD] bg-[#EFF6FF]'
                      : 'border-[#6B767F] hover:border-[#93C5FD]'
                  )}
                >
                  {placed && label ? (
                    <span
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData('text/plain', `${placed}|${qKey}`)
                      }
                      className="truncate font-normal text-[#202327]"
                    >
                      {placed} {label}
                    </span>
                  ) : (
                    <span className="w-full text-center font-bold text-[#202327]">{qKey}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Draggable/clickable option chips (left-aligned near drop boxes, matching Testino) */}
        <div className="flex flex-col items-start gap-2">
          {optionsEntries.map((opt) => {
            if (!reuse && used.has(opt.letter)) {
              return <div key={opt.letter} className="h-[12px]" />;
            }
            const isArmed = interaction.armedChip?.letter === opt.letter;
            return (
              <button
                key={opt.letter}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', opt.letter)}
                onClick={() =>
                  interaction.onArmChip(isArmed ? null : { letter: opt.letter })
                }
                className={cn(
                  'inline-flex h-[30px] cursor-move items-center rounded-[6px] border bg-white px-2 text-[14px] text-[#202327] transition-all hover:border-[#93C5FD]',
                  isArmed ? 'border-[#005FF0] bg-[#EFF6FF] shadow-xs' : 'border-[#8E979F]'
                )}
              >
                {opt.letter} {opt.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 8. Matching Headings List on Right Pane (mirrors `_HeadingList`) ────── */

function HeadingListBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const items = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);
  const used = new Set(
    items
      .map((it) => interaction.answers[String(asNum(it.number) ?? '')] ?? '')
      .filter(Boolean)
  );
  const title = asStr(block.options_title);
  const options = asArr(block.options)
    .map(asObj)
    .filter((o): o is Obj => o !== null);

  return (
    <div>
      {title ? (
        <p className="mb-6 text-[16px] leading-6 text-[#202327]">{plainText(title)}</p>
      ) : null}

      <div className="space-y-2 ps-4 pe-2 pb-6">
        {options.map((opt) => {
          const ltr = asStr(opt.letter);
          if (used.has(ltr)) return null;
          const isArmed = interaction.armedChip?.letter === ltr;
          return (
            <div key={ltr}>
              <button
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', ltr)}
                onClick={() =>
                  interaction.onArmChip(isArmed ? null : { letter: ltr })
                }
                className={cn(
                  'inline-flex min-h-[26px] cursor-move items-center rounded-[6px] border bg-white px-2 py-0.5 text-left text-[16px] leading-6 font-bold text-[#202327] transition-all hover:border-[#0EA5E9] hover:shadow-md',
                  isArmed ? 'border-[#0EA5E9] bg-[#EFF6FF] shadow-md' : 'border-[#8E979F]'
                )}
              >
                {ltr} {plainText(asStr(opt.text))}
              </button>
              <CambridgeTranslationLine text={asStr(opt.text)} className="text-[13px]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 9. Paragraph Matching Matrix Grid (mirrors `_LetterMatch`) ──────────── */

function LetterMatrixBlock({
  block,
  forceReuse = false,
  compactLabels = false,
  ...interaction
}: BlockInteractionProps & { block: Obj; forceReuse?: boolean; compactLabels?: boolean }) {
  const letters = asArr(block.letters).map(asStr).filter(Boolean);
  const reuse = forceReuse || block.options_may_be_reused === true;
  const rows = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-[#202327] text-left text-[15px] leading-6 text-[#202327]">
        <thead>
          <tr className="h-[44px] bg-[#CBCFD2]">
            <th className={cn('border border-[#202327]', compactLabels && 'min-w-[180px]')} />
            {letters.map((ltr) => (
              <th
                key={ltr}
                className="w-[36px] border border-[#202327] text-center font-normal"
              >
                {ltr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const qKey = String(asNum(row.number) ?? idx + 1);
            const current = interaction.answers[qKey] ?? '';
            return (
              <tr key={qKey} id={`cambridge-q-${qKey}`}>
                <td
                  className={cn(
                    'border border-[#202327] px-2.5 py-2',
                    compactLabels && 'whitespace-nowrap'
                  )}
                >
                  <span className="font-normal">{qKey}. </span>
                  {plainText(asStr(row.text))}
                  <CambridgeTranslationLine text={asStr(row.text)} className="whitespace-normal text-[13px]" />
                </td>
                {letters.map((ltr) => {
                  const selected = current === ltr;
                  return (
                    <td key={ltr} className="w-[40px] border border-[#202327] p-0 text-center">
                      <button
                        type="button"
                        aria-label={`Question ${qKey} option ${ltr}`}
                        onClick={() => {
                          interaction.onFocusQuestion(Number(qKey));
                          if (selected) {
                            interaction.onAnswer(qKey, '');
                            return;
                          }
                          if (!reuse) {
                            for (const other of rows) {
                              const oKey = String(asNum(other.number) ?? '');
                              if (oKey && oKey !== qKey && interaction.answers[oKey] === ltr) {
                                interaction.onAnswer(oKey, '');
                              }
                            }
                          }
                          interaction.onAnswer(qKey, ltr);
                        }}
                        className={cn(
                          'grid h-full min-h-[42px] w-full cursor-pointer place-items-center text-[18px] font-bold text-[#202327] transition-colors',
                          !selected && 'hover:bg-[#EFEFEF]'
                        )}
                      >
                        {selected ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── 10. Map Labelling (mirrors `_MapBlock`) ─────────────────────────────── */

function MapBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const image = asStr(block.image);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="grid items-start gap-6 py-4 lg:grid-cols-[minmax(280px,460px)_1fr]">
      {image ? (
        <div>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="block cursor-zoom-in text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={asStr(block.title) || 'Map diagram'}
              className="max-h-[420px] w-full max-w-[460px] object-contain"
            />
          </button>
          {zoomed ? (
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setZoomed(false)}
              className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={asStr(block.title) || 'Map diagram enlarged'}
                className="max-h-[90dvh] max-w-[92vw] rounded bg-white p-2 shadow-2xl"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <LetterMatrixBlock block={block} forceReuse compactLabels {...interaction} />
    </div>
  );
}

/* ── 11. TFNG / YNNG (mirrors `_LegendChoices`) ──────────────────────────── */

function LegendChoicesBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const legend = asArr(block.legend)
    .map(asObj)
    .filter((x): x is Obj => x !== null);
  const items = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);
  const choices = legend.map((e) => asStr(e.answer)).filter(Boolean);
  const shown =
    choices.length > 0
      ? choices
      : asStr(block.type) === 'yes_no_not_given'
        ? ['YES', 'NO', 'NOT GIVEN']
        : ['TRUE', 'FALSE', 'NOT GIVEN'];

  const legendSentence =
    legend.length > 0
      ? `${legend
          .map((e, i) => {
            const piece = `**${asStr(e.answer)}** ${asStr(e.meaning)}`;
            if (i === 0) return `Choose ${piece}`;
            if (i === legend.length - 1) return `or choose ${piece}`;
            return `choose ${piece}`;
          })
          .join(', ')}.`
      : '';

  return (
    <div>
      {legendSentence ? (
        <p className="mb-4 text-[16px] leading-6 text-[#202327]">
          <FormattedText text={legendSentence} />
        </p>
      ) : null}

      {items.map((item, i) => {
        const qKey = String(asNum(item.number) ?? i + 1);
        return (
          <ChoiceQuestion
            key={qKey}
            number={qKey}
            stem={asStr(item.text)}
            options={shown.map((c) => ({ value: c, label: c }))}
            selected={interaction.answers[qKey] ?? ''}
            interaction={interaction}
          />
        );
      })}
    </div>
  );
}

/* ── 12. Short Answer Questions (Cambridge 16–21) ────────────────────────── */

function ShortAnswerBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const title = asStr(block.title);
  const items = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);

  return (
    <div className="space-y-5 text-[16px] leading-6 text-[#202327]">
      {title ? <h4 className="text-[20px] leading-[1.4] font-bold">{plainText(title)}</h4> : null}
      {items.map((item, i) => {
        const num = asNum(item.number) ?? i + 1;
        const qKey = String(num);
        const text = asStr(item.text);
        const hasInlineGap = /\{\d+\}/.test(text);
        const val = interaction.answers[qKey] ?? '';
        const isFocused = interaction.activeQuestion === num;

        return (
          <div key={qKey} id={`cambridge-q-${qKey}`} className="space-y-2">
            {hasInlineGap ? (
              <p>
                <span className="font-bold">{qKey} </span>
                <GapText text={text} boldShortLines={false} {...interaction} />
              </p>
            ) : (
              <>
                <div>
                  <p>
                    <span className="font-bold">{qKey} </span>
                    <FormattedText text={text} />
                  </p>
                  <CambridgeTranslationLine text={text} />
                </div>
                <div className="relative inline-flex h-[28px] w-full max-w-[260px] items-center">
                  <input
                    type="text"
                    value={val}
                    onFocus={() => interaction.onFocusQuestion(num)}
                    onChange={(e) => interaction.onAnswer(qKey, e.target.value)}
                    aria-label={`Question ${qKey}`}
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(
                      'h-[28px] w-full rounded-[3px] bg-white px-2 text-[14px] leading-5 text-[#202327] focus:outline-none',
                      isFocused
                        ? 'border-2 border-[#72A0FB]'
                        : 'border border-[#4F575E] focus:border-2 focus:border-[#72A0FB]'
                    )}
                  />
                  {!val ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] font-bold text-[#202327]">
                      {qKey}
                    </span>
                  ) : null}
                </div>
              </>
            )}
            {!interaction.hideAnswerControls ? (
              <AnswerCheckBar
                qNum={qKey}
                given={val}
                answerKey={interaction.answerKey}
                hasAnalysis={interaction.analysisQuestions?.has(num) ?? false}
                onOpenAnalysis={interaction.onOpenAnalysis}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── 13. Diagram Labelling (Cambridge 16–21) ─────────────────────────────── */

function DiagramLabellingBlock({
  block,
  ...interaction
}: BlockInteractionProps & { block: Obj }) {
  const title = asStr(block.title);
  const image = asStr(block.image);
  const diagrams = asArr(block.diagrams)
    .map(asObj)
    .filter((d): d is Obj => d !== null);
  const flatLabels = asArr(block.labels).map(asStr).filter(Boolean);
  const flatItems = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="space-y-4 text-[16px] leading-6 text-[#202327]">
      {title ? <h4 className="text-[20px] leading-[1.4] font-bold">{plainText(title)}</h4> : null}

      {image ? (
        <div>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="block w-full cursor-zoom-in rounded-[4px] border border-[#E5E7EB] bg-white p-2 text-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={title || 'Diagram'}
              className="mx-auto max-h-[420px] w-full object-contain"
            />
          </button>
          {zoomed ? (
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setZoomed(false)}
              className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={title || 'Diagram enlarged'}
                className="max-h-[90dvh] max-w-[92vw] rounded bg-white p-2 shadow-2xl"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {diagrams.map((diag, dIdx) => {
        const dTitle = asStr(diag.title);
        const labels = asArr(diag.labels).map(asStr).filter(Boolean);
        return (
          <div
            key={dIdx}
            className="space-y-2.5 rounded-[4px] border border-[#E5E7EB] bg-[#FAFAFA] p-4"
          >
            {dTitle ? <h5 className="text-[17px] font-bold text-[#202327]">{dTitle}</h5> : null}
            <ul className="space-y-2.5">
              {labels.map((lbl, lIdx) => (
                <li key={lIdx} className="leading-[1.9]">
                  <span className="me-1.5 font-bold">•</span>
                  <GapText text={lbl} boldShortLines={false} {...interaction} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {flatLabels.length > 0 ? (
        <ul className="space-y-2.5">
          {flatLabels.map((lbl, i) => (
            <li key={i} className="leading-[1.9]">
              <span className="me-1.5 font-bold">•</span>
              <GapText text={lbl} boldShortLines={false} {...interaction} />
            </li>
          ))}
        </ul>
      ) : null}

      {flatItems.length > 0 ? (
        <div className="space-y-2.5">
          {flatItems.map((it, i) => {
            const text = asStr(it.text);
            const num = asNum(it.number);
            return (
              <p key={i} className="leading-[1.9]">
                {num !== null && !/\{\d+\}/.test(text) ? (
                  <GapText text={`${num}. ${text} {${num}}`} boldShortLines={false} {...interaction} />
                ) : (
                  <GapText text={text} boldShortLines={false} {...interaction} />
                )}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ── 14. Flow Chart (`flow_chart` & `flowchart`, Cambridge 16–21) ────────── */

function FlowChartBlock({ block, ...interaction }: BlockInteractionProps & { block: Obj }) {
  const title = asStr(block.title);
  const steps = asArr(block.steps)
    .map(asObj)
    .filter((s): s is Obj => s !== null);
  const items = asArr(block.items)
    .map(asObj)
    .filter((x): x is Obj => x !== null);
  const wordBox = asArr(block.word_box)
    .map(asObj)
    .filter((x): x is Obj => x !== null);

  return (
    <div className="space-y-4 text-[16px] leading-6 text-[#202327]">
      {title ? <h4 className="text-[20px] leading-[1.4] font-bold">{plainText(title)}</h4> : null}

      {/* Shape A: `flowchart` with boxed `steps` connected by ↓ arrows */}
      {steps.length > 0 ? (
        <div className="space-y-2">
          {steps.map((step, sIdx) => {
            const stepTitle = asStr(step.title);
            const lines = asArr(step.lines).map(asStr).filter(Boolean);
            const stepText = asStr(step.text);
            return (
              <div key={sIdx} className="flex flex-col items-stretch">
                <div className="space-y-1.5 rounded-[4px] border border-[#202327] bg-white px-4 py-3">
                  {stepTitle ? <p className="font-bold">{stepTitle}</p> : null}
                  {stepText ? (
                    <p className="leading-[1.85]">
                      <GapText text={stepText} boldShortLines={false} {...interaction} />
                    </p>
                  ) : null}
                  {lines.map((line, lIdx) => (
                    <p key={lIdx} className="leading-[1.85]">
                      <GapText text={line} boldShortLines={false} {...interaction} />
                    </p>
                  ))}
                </div>
                {sIdx < steps.length - 1 ? (
                  <div className="py-1 text-center text-[18px] leading-none font-bold text-[#4F575E]">
                    ↓
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Shape B: `flow_chart` with structured `items` grouped by heading into arrow-connected steps (matching Testino) */}
      {steps.length === 0 && items.length > 0 ? (() => {
        const grouped: Obj[][] = [];
        for (const it of items) {
          if (asStr(it.kind) === 'heading' || grouped.length === 0) {
            grouped.push([it]);
          } else {
            grouped[grouped.length - 1]!.push(it);
          }
        }
        return (
          <div className="max-w-[680px] space-y-2">
            {grouped.map((grp, gIdx) => (
              <div key={gIdx} className="flex flex-col items-stretch">
                <div className="space-y-1.5 rounded-[4px] border border-[#202327] bg-white px-4 py-3">
                  {grp.map((it, iIdx) => {
                    const kind = asStr(it.kind) || 'text';
                    const text = asStr(it.text);
                    const hasGap = /\{\d+\}/.test(text);
                    const prefix = kind === 'bullet' ? '• ' : kind === 'dash' ? '- ' : '';
                    return (
                      <p
                        key={iIdx}
                        className={cn(
                          'leading-[1.85]',
                          kind === 'heading' && !hasGap && 'font-bold'
                        )}
                      >
                        {prefix ? <span>{prefix}</span> : null}
                        <GapText text={text} boldShortLines={false} {...interaction} />
                      </p>
                    );
                  })}
                </div>
                {gIdx < grouped.length - 1 ? (
                  <div className="py-1 text-center text-[18px] leading-none font-bold text-[#4F575E]">
                    ↓
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        );
      })() : null}

      {/* Optional Word Box underneath */}
      {wordBox.length > 0 ? (
        <div className="flex justify-center pt-2">
          <div className="flex flex-wrap border border-[#202327] bg-white">
            {wordBox.map((opt, i) => {
              const ltr = asStr(opt.letter);
              const isArmed = interaction.armedChip?.letter === ltr;
              return (
                <button
                  key={i}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', ltr)}
                  onClick={() =>
                    interaction.onArmChip(isArmed ? null : { letter: ltr })
                  }
                  className={cn(
                    'cursor-grab px-4 py-1 text-[16px] leading-6 text-[#202327] transition-colors hover:bg-[#F1F2EB] active:cursor-grabbing',
                    isArmed && 'bg-[#BBD8F0] font-semibold'
                  )}
                >
                  {ltr}. {plainText(asStr(opt.text))}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Writing Prompt & Speaking Views (mirrors `_promptBlock`, `_CueCard`, `_TopicList`) ── */

export function WritingPromptView({ segment }: { segment: Obj }) {
  const prompt = asArr(segment.prompt).map(asStr).filter(Boolean);
  const instructions = asArr(segment.instructions).map(asStr).filter(Boolean);
  const minWords = asNum(segment.min_words);
  const image = asStr(segment.image);
  const caption = asStr(segment.image_caption);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div dir="ltr" lang="en" className="ielts-prose space-y-2.5 text-left text-[#202327]">
      {prompt.map((line, i) => (
        <div key={i}>
          <p className="text-[15px] leading-[1.55] font-bold italic">
            <FormattedText text={line} />
          </p>
          <CambridgeTranslationLine text={line} />
        </div>
      ))}
      {instructions.map((line, i) => (
        <div key={i}>
          <p className="text-[15px] leading-[1.55]">
            <FormattedText text={line} />
          </p>
          <CambridgeTranslationLine text={line} />
        </div>
      ))}
      {minWords && minWords > 0 ? (
        <p className="text-[15px] font-semibold">Write at least {minWords} words.</p>
      ) : null}
      {image ? (
        <figure className="py-3">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="block w-full cursor-zoom-in text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={caption || 'Writing Task Chart'}
              className="max-h-[420px] w-full object-contain object-left"
            />
          </button>
          {zoomed ? (
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setZoomed(false)}
              className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={caption || 'Writing Task Chart enlarged'}
                className="max-h-[90dvh] max-w-[92vw] rounded bg-white p-2 shadow-2xl"
              />
            </div>
          ) : null}
        </figure>
      ) : null}
    </div>
  );
}

export type SpeakingQuestionItem = {
  number: number;
  partIndex: number;
  partNum: number;
  kind: 'question' | 'cue_card';
  topic?: string;
  text?: string;
  cueCard?: Obj;
};

/** Flattens Speaking Parts 1–3 into individually numbered items (1..N) matching Testino. */
export function extractSpeakingItems(segments: Obj[]): SpeakingQuestionItem[] {
  const out: SpeakingQuestionItem[] = [];
  let qNum = 1;
  segments.forEach((seg, partIndex) => {
    const partNum = asNum(seg.part) ?? partIndex + 1;
    const cueCard = asObj(seg.cue_card);
    if (cueCard) {
      out.push({ number: qNum++, partIndex, partNum, kind: 'cue_card', cueCard });
    }
    const allTopics = [
      ...asArr(seg.example_topics).map(asObj),
      ...asArr(seg.topics).map(asObj),
    ].filter((x): x is Obj => x !== null);
    for (const topicObj of allTopics) {
      const topic = asStr(topicObj.topic);
      const questions = asArr(topicObj.questions).map(asStr).filter(Boolean);
      for (const q of questions) {
        out.push({ number: qNum++, partIndex, partNum, kind: 'question', topic, text: q });
      }
    }
  });
  return out;
}

export function SpeakingSegmentView({
  item,
  recordedUrl,
  onRecorded,
}: {
  item: SpeakingQuestionItem;
  recordedUrl?: string;
  onRecorded: (qNum: number, blobUrl: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [recorderState, setRecorderState] = useState<{
    recorder: MediaRecorder;
    stream: MediaStream;
    timer: number;
  } | null>(null);

  async function toggleRecord() {
    setMicError(null);
    if (recording && recorderState) {
      window.clearInterval(recorderState.timer);
      recorderState.recorder.stop();
      recorderState.stream.getTracks().forEach((t) => t.stop());
      setRecorderState(null);
      setRecording(false);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        onRecorded(item.number, url);
      };
      recorder.start();
      setRecSec(0);
      const timer = window.setInterval(() => setRecSec((s) => s + 1), 1000);
      setRecorderState({ recorder, stream, timer });
      setRecording(true);
    } catch {
      setMicError('Please allow microphone access to record your speaking answer.');
    }
  }

  const speakText =
    item.kind === 'cue_card' && item.cueCard
      ? [
          asStr(item.cueCard.task),
          ...asArr(item.cueCard.you_should_say).map(asStr),
          asStr(item.cueCard.and),
        ]
          .filter(Boolean)
          .join('. ')
      : item.text ?? '';

  const recMmSs = `${String(Math.floor(recSec / 60)).padStart(2, '0')}:${String(recSec % 60).padStart(2, '0')}`;

  return (
    <div
      dir="ltr"
      lang="en"
      className="ielts-prose grid items-start gap-8 pt-4 text-left text-[#202327] md:grid-cols-[240px_1fr]"
    >
      {/* Left: Examiner Portrait Card (mirrors Testino's Speaking examiner column) */}
      <div className="flex flex-col items-center rounded-[12px] border border-[#E5E7EB] bg-[#F8FAFC] p-6 text-center">
        <div className="grid size-28 place-items-center rounded-full bg-[#E9EFF6] text-[#4F575E]">
          <svg viewBox="0 0 24 24" className="size-16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="12" cy="8" r="4" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
          </svg>
        </div>
        <p className="mt-3 text-[15px] font-bold text-[#202327]">IELTS Examiner</p>
        <p className="text-[13px] text-[#6B767F]">Speaking Part {item.partNum}</p>
        {item.topic ? (
          <div className="mt-2 flex flex-col items-center">
            <span className="rounded-full bg-[#F1F2EB] px-3 py-0.5 text-[12px] font-semibold text-[#4F575E]">
              {item.topic}
            </span>
            <CambridgeTranslationLine text={item.topic} className="text-[12px]" />
          </div>
        ) : null}
      </div>

      {/* Right: Active Question / Cue Card + Record Answer Control */}
      <div className="space-y-6">
        {item.kind === 'cue_card' && item.cueCard ? (
          <div className="space-y-2.5 rounded-[12px] border border-[#8E979F] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-[18px] font-bold">
                  {item.number}. {asStr(item.cueCard.task)}
                </h3>
                <CambridgeTranslationLine text={asStr(item.cueCard.task)} />
              </div>
              <SpeakButton text={speakText} />
            </div>
            {asArr(item.cueCard.you_should_say).length > 0 ? (
              <p className="pt-1 text-[14px] font-semibold text-[#4F575E]">You should say:</p>
            ) : null}
            {asArr(item.cueCard.you_should_say).map((point, i) => (
              <div key={i} className="ps-3">
                <p className="text-[16px]">• {asStr(point)}</p>
                <CambridgeTranslationLine text={asStr(point)} className="text-[13px]" />
              </div>
            ))}
            {asStr(item.cueCard.and) ? (
              <div className="pt-1">
                <p className="text-[16px] font-semibold">{asStr(item.cueCard.and)}</p>
                <CambridgeTranslationLine text={asStr(item.cueCard.and)} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <SpeakButton text={speakText} />
            <div className="flex-1">
              <p className="pt-1 text-[19px] leading-snug font-medium text-[#202327]">
                <strong className="me-1.5 font-bold">{item.number}.</strong>
                {item.text}
              </p>
              <CambridgeTranslationLine text={item.text} />
            </div>
          </div>
        )}

        {/* Interactive Record Answer Control (mirrors Testino's `Start record the answer`) */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={toggleRecord}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2.5 rounded-[10px] px-5 py-3 text-[15px] font-bold text-white shadow-xs transition-opacity hover:opacity-90',
              recording ? 'bg-[#DC2626]' : 'bg-[#077F83]'
            )}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="2.5" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
            </svg>
            <span>
              {recording ? `Stop recording (${recMmSs})` : 'Start record the answer'}
            </span>
          </button>

          {micError ? <p className="text-xs font-semibold text-rose-600">{micError}</p> : null}

          {recordedUrl && !recording ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <span className="text-xs font-bold text-[#15803D]">✓ Recorded answer</span>
              <audio controls src={recordedUrl} className="h-9 flex-1" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
