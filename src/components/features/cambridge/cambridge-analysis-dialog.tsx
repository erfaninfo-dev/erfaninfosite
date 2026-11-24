'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  CambridgeAnalysisBundle,
  CambridgeAnalysisLang,
  CambridgeAnalysisQuestion,
} from '@/lib/cambridge/analysis';
import type { CambridgeKeyedAnswer } from '@/lib/cambridge/api';

type DepthMode = 'brief' | 'comprehensive';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Formats an analysis paragraph cleanly, bolding inline **markdown** AND
 * emphasizing the official answer word(s) just like Testino's Analysis sheet.
 */
function renderAnalysisParagraph(text: string, answerText?: string): ReactNode {
  const answerTokens = (answerText ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  const boldSegments = text.split(/(\*\*[^*]+\*\*)/g);
  const answerPattern =
    answerTokens.length > 0
      ? new RegExp(
          `(?<![A-Za-z])(${answerTokens.map(escapeRegExp).join('|')})(?![A-Za-z])`,
          'gi'
        )
      : null;

  return boldSegments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: '#111827' }}>
          {seg.slice(2, -2)}
        </strong>
      );
    }
    if (!answerPattern) return <span key={i}>{seg}</span>;

    const pieces = seg.split(answerPattern);
    return (
      <span key={i}>
        {pieces.map((piece, j) =>
          j % 2 === 1 ? (
            <strong key={j} style={{ fontWeight: 700, color: '#111827' }}>
              {piece}
            </strong>
          ) : (
            <span key={j}>{piece}</span>
          )
        )}
      </span>
    );
  });
}

/**
 * Testino-matched floating Reading Analysis modal (centered, not full-screen,
 * internally scrollable) with:
 * - Fixed header: `Analysis`, Part 1/2/3 switcher, `EN | فارسی | کوردی` tabs, and close `✕`
 * - Per-question red `Question : N` heading
 * - Two tabs: `brief` and `comprehensive`
 * - Green `Answer Location` outline button that jumps & highlights the passage paragraph
 */
export function CambridgeAnalysisDialog({
  bundle,
  activePartNumber,
  focusQuestion,
  initialLang,
  answerKey,
  onClose,
  onLocateAnswer,
}: {
  bundle: CambridgeAnalysisBundle;
  activePartNumber: number;
  focusQuestion: number | null;
  initialLang: CambridgeAnalysisLang;
  answerKey: Record<string, CambridgeKeyedAnswer>;
  onClose: () => void;
  onLocateAnswer: (item: CambridgeAnalysisQuestion) => void;
}) {
  const [lang, setLang] = useState<CambridgeAnalysisLang>(initialLang);
  const [selectedPart, setSelectedPart] = useState<number>(() => {
    if (focusQuestion !== null) {
      const hit = bundle.questions.find((q) => q.q === focusQuestion);
      if (hit) return hit.part;
    }
    return activePartNumber;
  });
  const [depthByQ, setDepthByQ] = useState<Record<number, DepthMode>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const availableParts = useMemo(() => {
    const set = new Set<number>();
    for (const q of bundle.questions) set.add(q.part);
    return [...set].sort((a, b) => a - b);
  }, [bundle.questions]);

  const visibleQuestions = useMemo(
    () => bundle.questions.filter((q) => q.part === selectedPart),
    [bundle.questions, selectedPart]
  );

  // Scroll smoothly inside the dialog body to the focused question when opened per-question.
  useEffect(() => {
    if (focusQuestion === null) return;
    const id = window.setTimeout(() => {
      const el = document.getElementById(`cambridge-analysis-q-${focusQuestion}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => window.clearTimeout(id);
  }, [focusQuestion, selectedPart]);

  // Close on Escape key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const langTabs: ReadonlyArray<{ id: CambridgeAnalysisLang; label: string; available: boolean }> = [
    { id: 'en', label: 'EN', available: true },
    { id: 'fa', label: 'فارسی', available: bundle.hasFa },
    { id: 'ckb', label: 'کوردی', available: bundle.hasCkb },
  ];

  const locationLabel =
    lang === 'fa' ? 'محل پاسخ در متن' : lang === 'ckb' ? 'شوێنی وەڵام لە دەقدا' : 'Answer Location';

  return (
    <div
      dir="ltr"
      role="dialog"
      aria-modal="true"
      aria-label="Reading Analysis"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(32, 35, 39, 0.28)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 'min(92vw, 790px)',
          height: 'min(80dvh, 660px)',
          maxHeight: '84dvh',
          overflow: 'hidden',
          borderRadius: '14px',
          border: '1px solid #CBD5E1',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)',
        }}
      >
        {/* Fixed Header Bar */}
        <div
          style={{
            position: 'relative',
            flexShrink: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '14px 20px 12px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#FAFAFA',
          }}
        >
          {/* Subtle centered Testino top handle dots */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '11px',
              letterSpacing: '2px',
              color: '#9CA3AF',
              pointerEvents: 'none',
            }}
          >
            •••
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '21px',
                lineHeight: '28px',
                fontWeight: 400,
                color: '#4F575E',
              }}
            >
              Analysis
            </h2>

            {availableParts.length > 1 ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px',
                  borderRadius: '9999px',
                  backgroundColor: '#ECEEF1',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {availableParts.map((p) => {
                  const active = selectedPart === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setSelectedPart(p);
                        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                      }}
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '3px 10px',
                        backgroundColor: active ? '#FFFFFF' : 'transparent',
                        color: active ? '#202327' : '#6B767F',
                        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                        fontWeight: active ? 700 : 600,
                      }}
                    >
                      Part {p}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* 3 Language Tabs: EN | فارسی | کوردی */}
            <div
              role="group"
              aria-label="Analysis language"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '2px',
                borderRadius: '9999px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {langTabs
                .filter((t) => t.available)
                .map((tab) => {
                  const active = lang === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLang(tab.id)}
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '4px 12px',
                        backgroundColor: active ? '#077F83' : 'transparent',
                        color: active ? '#FFFFFF' : '#4F575E',
                        fontWeight: 700,
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close analysis"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                border: 'none',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                color: '#4F575E',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{ width: '20px', height: '20px' }}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Questions Analysis Body */}
        <div
          ref={scrollContainerRef}
          className="ielts-scroll"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '20px 26px 28px',
          }}
        >
          {visibleQuestions.map((item, idx) => {
            const hasComprehensive =
              item.comprehensiveMissing !== true &&
              item.en.comprehensive.trim().length > 0 &&
              item.en.comprehensive.trim() !== item.en.brief.trim();
            const depth: DepthMode = hasComprehensive ? (depthByQ[item.q] ?? 'brief') : 'brief';
            const enText =
              depth === 'comprehensive'
                ? item.en.comprehensive || item.en.brief
                : item.en.brief || item.en.comprehensive;
            const enParagraphs = enText
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);

            const trCopy = lang === 'fa' ? item.fa : lang === 'ckb' ? item.ckb : null;
            const trText = trCopy
              ? depth === 'comprehensive'
                ? trCopy.comprehensive || trCopy.brief
                : trCopy.brief || trCopy.comprehensive
              : '';
            const trParagraphs =
              lang !== 'en' && trText && trText !== enText
                ? trText
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter(Boolean)
                : [];
            const pairPerParagraph =
              trParagraphs.length > 0 && trParagraphs.length === enParagraphs.length;

            const keyedAnswer = answerKey[String(item.q)]?.answer ?? '';

            return (
              <section
                key={item.q}
                id={`cambridge-analysis-q-${item.q}`}
                style={{
                  scrollMarginTop: '14px',
                  paddingBottom: '22px',
                  marginBottom: idx < visibleQuestions.length - 1 ? '22px' : '0px',
                  borderBottom:
                    idx < visibleQuestions.length - 1 ? '1px solid #EEF2F6' : 'none',
                  backgroundColor: focusQuestion === item.q ? '#FAFAFA' : 'transparent',
                  borderRadius: focusQuestion === item.q ? '10px' : '0px',
                  padding: focusQuestion === item.q ? '12px 14px 20px' : '0 0 22px',
                }}
              >
                {/* Red "Question : N" heading (exact Testino visual style) */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      lineHeight: '24px',
                      fontWeight: 700,
                      color: '#B91C1C',
                    }}
                  >
                    Question : {item.q}
                    {item.chooseTwoGroup ? (
                      <span
                        style={{
                          marginInlineStart: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6B767F',
                        }}
                      >
                        (Q{item.chooseTwoGroup.globalQuestions.join(' & ')})
                      </span>
                    ) : null}
                  </h3>
                  {keyedAnswer ? (
                    <span
                      style={{
                        borderRadius: '9999px',
                        backgroundColor: '#E7F6F4',
                        padding: '3px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#077F83',
                      }}
                    >
                      Answer: {keyedAnswer}
                    </span>
                  ) : null}
                </div>

                {/* Tabs: brief (always) + comprehensive (only when this question has a distinct comprehensive analysis) */}
                <div
                  role="tablist"
                  aria-label={`Question ${item.q} detail level`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px',
                    marginBottom: '16px',
                    borderRadius: '9999px',
                    backgroundColor: '#F1F2F4',
                  }}
                >
                  {(hasComprehensive ? (['brief', 'comprehensive'] as const) : (['brief'] as const)).map(
                    (tabId) => {
                      const active = depth === tabId;
                      return (
                        <button
                          key={tabId}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setDepthByQ((prev) => ({ ...prev, [item.q]: tabId }))}
                          style={{
                            cursor: 'pointer',
                            border: 'none',
                            borderRadius: '9999px',
                            padding: '6px 18px',
                            fontSize: '13.5px',
                            fontWeight: active ? 600 : 500,
                            backgroundColor: active ? '#2B2F36' : 'transparent',
                            color: active ? '#FFFFFF' : '#6B767F',
                            transition: 'background-color 150ms, color 150ms',
                          }}
                        >
                          {tabId}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Analysis Copy: Always English + RTL Persian/Kurdish translation underneath when selected */}
                <div
                  dir="ltr"
                  lang="en"
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.72,
                    color: '#202327',
                    textAlign: 'left',
                  }}
                >
                  {enParagraphs.map((para, pIdx) => (
                    <div
                      key={pIdx}
                      style={{
                        marginBottom: pIdx < enParagraphs.length - 1 ? '14px' : '0px',
                      }}
                    >
                      <p style={{ margin: 0 }}>{renderAnalysisParagraph(para, keyedAnswer)}</p>
                      {pairPerParagraph && trParagraphs[pIdx] ? (
                        <p
                          dir="rtl"
                          lang={lang}
                          style={{
                            marginTop: '8px',
                            marginBottom: 0,
                            borderRadius: '6px',
                            borderRight: '2px solid rgba(7, 127, 131, 0.6)',
                            backgroundColor: '#F0FAF9',
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '14px',
                            lineHeight: 1.9,
                            color: '#1E4E52',
                          }}
                        >
                          {renderAnalysisParagraph(trParagraphs[pIdx], keyedAnswer)}
                        </p>
                      ) : null}
                    </div>
                  ))}

                  {!pairPerParagraph && trParagraphs.length > 0 ? (
                    <div
                      dir="rtl"
                      lang={lang}
                      style={{
                        marginTop: '12px',
                        borderRadius: '6px',
                        borderRight: '2px solid rgba(7, 127, 131, 0.6)',
                        backgroundColor: '#F0FAF9',
                        padding: '10px 14px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '14px',
                        lineHeight: 1.9,
                        color: '#1E4E52',
                      }}
                    >
                      {trParagraphs.map((tPara, tIdx) => (
                        <p
                          key={tIdx}
                          style={{
                            marginTop: 0,
                            marginBottom: tIdx < trParagraphs.length - 1 ? '10px' : '0px',
                          }}
                        >
                          {renderAnalysisParagraph(tPara, keyedAnswer)}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Green "Answer Location" outline button (exact Testino look) */}
                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => onLocateAnswer(item)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      border: '1px solid #86EFAC',
                      backgroundColor: '#F0FDF4',
                      padding: '5px 12px',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: '#16A34A',
                    }}
                  >
                    {locationLabel}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
