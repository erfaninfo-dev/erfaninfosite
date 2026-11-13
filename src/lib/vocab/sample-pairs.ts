/**
 * Splits a sample into English / local pairs, the same way the app's
 * `parseSampleAlignedPairs` reads the CMS text.
 *
 * Passages are labelled `English:` then `فارسی:` or `کوردی:`. Each labelled
 * block is one pair. A passage with no labels stays one block.
 */

export type SamplePair = {
  en: string;
  local: string;
};

const BIDI = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const EN_LABEL = /^(?:english|en)\s*:+\s*/i;
const LOCAL_LABEL =
  /^(?:fa|kurdish(?:\s+sorani)?|kur|فارسی|کوردی|كوردی|کردی|كوردي)(?:\s*(?:\(\s*سورانی\s*\)|سورانی))?\s*:+\s*/iu;

function clean(line: string): string {
  return line.replace(BIDI, '').trim();
}

function paragraphs(block: string): string[] {
  return block
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function pairsFromBlocks(enBlock: string, localBlock: string): SamplePair[] {
  const en = enBlock.trim();
  const local = localBlock.trim();
  if (!en && !local) return [];
  const enParts = paragraphs(en);
  const localParts = paragraphs(local);
  if (
    enParts.length > 0 &&
    localParts.length > 0 &&
    enParts.length === localParts.length &&
    enParts.every(Boolean) &&
    localParts.every(Boolean)
  ) {
    return enParts.map((part, index) => ({ en: part, local: localParts[index] ?? '' }));
  }
  return [{ en, local }];
}

export function parseSamplePairs(raw: string): SamplePair[] {
  const text = raw.trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).map(clean);
  const labelled = lines.some((line) => EN_LABEL.test(line) || LOCAL_LABEL.test(line));
  if (!labelled) {
    const rtl = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
    return rtl > text.length / 20 ? [{ en: '', local: text }] : [{ en: text, local: '' }];
  }

  const out: SamplePair[] = [];
  let mode: '' | 'en' | 'local' = '';
  let enBuf = '';
  let localBuf = '';

  const flush = () => {
    const pairs = pairsFromBlocks(enBuf, localBuf);
    enBuf = '';
    localBuf = '';
    out.push(...pairs);
  };

  for (const line of lines) {
    if (!line) continue;
    if (EN_LABEL.test(line)) {
      if (mode === 'local') flush();
      mode = 'en';
      const rest = line.replace(EN_LABEL, '').trim();
      if (rest) enBuf += `${enBuf ? '\n' : ''}${rest}`;
      continue;
    }
    if (LOCAL_LABEL.test(line)) {
      if (mode === 'local' && localBuf) flush();
      mode = 'local';
      const rest = line.replace(LOCAL_LABEL, '').trim();
      if (rest) localBuf += `${localBuf ? '\n' : ''}${rest}`;
      continue;
    }
    if (mode === 'en') enBuf += `${enBuf ? '\n' : ''}${line}`;
    else if (mode === 'local') localBuf += `${localBuf ? '\n' : ''}${line}`;
  }
  flush();
  return out.filter((pair) => pair.en || pair.local);
}
