/**
 * Splits a grammar lesson the way the app does.
 *
 * The CMS stores English and the gloss in one blob, one line after another,
 * often labelled `فارسی:`. English stays left-to-right. Persian and Kurdish
 * lines are their own right-to-left blocks, so a period on an English sentence
 * is not pulled to the other end.
 */

export type LessonLine = {
  text: string;
  kind: 'english' | 'local' | 'heading';
};

const ARABIC =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN = /[A-Za-z]/g;
const LOCAL_LABEL =
  /^\s*(?:فارسی|کوردی|كوردی|کردی)\s*[:：]?\s*/u;

function dominantRtl(text: string): boolean {
  const rtl = text.match(ARABIC)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;
  return rtl > latin;
}

export function parseGrammarLessonLines(raw: string): LessonLine[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const out: LessonLine[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || /^[_\-–—.\s]+$/.test(trimmed)) continue;

    if (LOCAL_LABEL.test(trimmed)) {
      const text = trimmed.replace(LOCAL_LABEL, '').trim();
      if (text) out.push({ text, kind: 'local' });
      continue;
    }

    if (/^\s*english\s*:?/i.test(trimmed)) {
      const text = trimmed.replace(/^\s*english\s*:?\s*/i, '').trim();
      if (text) out.push({ text, kind: 'english' });
      continue;
    }

    if (
      /^\s*unit\s+\d+/i.test(trimmed) ||
      trimmed.toLowerCase().startsWith('title:') ||
      trimmed.startsWith('عنوان')
    ) {
      out.push({ text: trimmed, kind: dominantRtl(trimmed) ? 'local' : 'heading' });
      continue;
    }

    const marker = /^\s*([A-Za-z])\s*(?:[):,]|[-_]+)\s*(.*)$/.exec(trimmed);
    if (marker) {
      const title = marker[2]?.trim() ?? '';
      const heading = title ? `${marker[1]!.toUpperCase()}) ${title}` : `${marker[1]!.toUpperCase()})`;
      out.push({ text: heading, kind: dominantRtl(heading) ? 'local' : 'heading' });
      continue;
    }

    out.push({ text: trimmed, kind: dominantRtl(trimmed) ? 'local' : 'english' });
  }

  return out;
}
