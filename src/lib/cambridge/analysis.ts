import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

export type CambridgeAnalysisLang = 'en' | 'fa' | 'ckb';

export type CambridgeAnalysisCopy = {
  brief: string;
  comprehensive: string;
};

export type CambridgeAnalysisQuestion = {
  q: number;
  part: number;
  questionInPart: number;
  en: CambridgeAnalysisCopy;
  fa: CambridgeAnalysisCopy;
  ckb: CambridgeAnalysisCopy;
  comprehensiveMissing?: boolean;
  chooseTwoGroup?: { globalQuestions: number[]; slot: string };
  /** Longest quoted English passage snippet extracted from `en.brief` for Answer Location jump. */
  locationHint: string | null;
};

export type CambridgeAnalysisBundle = {
  slug: string;
  test: number;
  bookCode: string;
  hasFa: boolean;
  hasCkb: boolean;
  questions: CambridgeAnalysisQuestion[];
};

type RawAnalysisFile = {
  bookCode?: unknown;
  parts?: Array<{
    part?: unknown;
    questions?: Array<{
      q?: unknown;
      questionInPart?: unknown;
      brief?: unknown;
      comprehensive?: unknown;
      comprehensiveMissing?: unknown;
      chooseTwoGroup?: {
        globalQuestions?: unknown;
        slot?: unknown;
      };
    }>;
  }>;
};

function volumeFromSlug(slug: string): number | null {
  const m = slug.match(/^(\d+)-/i);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function readJsonSafe(filePath: string): Promise<RawAnalysisFile | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as RawAnalysisFile;
  } catch {
    return null;
  }
}

/**
 * Extracts the most distinctive verbatim English passage quote from `en.brief`
 * (or `en.comprehensive`) so the green "Answer Location" button can scroll
 * straight to the matching paragraph in the Reading passage.
 */
function extractLocationHint(brief: string, comprehensive: string): string | null {
  const candidates: string[] = [];

  const scan = (src: string) => {
    // Prefer quotes that follow "passage states / mentions / says / notes / explains / reads"
    const afterPassage =
      src.match(
        /(?:passage|text|paragraph|author)[^"\n]{0,80}"([^"]{14,320})"/gi
      ) ?? [];
    for (const hit of afterPassage) {
      const m = hit.match(/"([^"]{14,320})"/);
      if (m?.[1]) candidates.push(m[1].trim());
    }
    if (candidates.length === 0) {
      const allQuotes = src.match(/"([^"]{14,320})"/g) ?? [];
      for (const q of allQuotes) {
        candidates.push(q.slice(1, -1).trim());
      }
    }
  };

  scan(brief);
  if (candidates.length === 0) scan(comprehensive);
  if (candidates.length === 0) return null;

  // Prefer the longest quote (most specific to one paragraph, skipping ellipsis-only fragments).
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] ?? null;
}

function indexLocaleFile(
  file: RawAnalysisFile | null
): Map<number, CambridgeAnalysisCopy> {
  const map = new Map<number, CambridgeAnalysisCopy>();
  if (!file || !Array.isArray(file.parts)) return map;
  for (const part of file.parts) {
    if (!part || !Array.isArray(part.questions)) continue;
    for (const item of part.questions) {
      if (!item || typeof item.q !== 'number') continue;
      const brief = typeof item.brief === 'string' ? item.brief.trim() : '';
      const comprehensive =
        typeof item.comprehensive === 'string' ? item.comprehensive.trim() : '';
      map.set(Math.floor(item.q), {
        brief,
        comprehensive: comprehensive || brief,
      });
    }
  }
  return map;
}

/**
 * Loads local Reading Analysis JSONs (EN + FA + CKB) from
 * `output/ielts-analysis/C{vol}_Reading_analysis/test{N}_analysis[.(fa|ckb)].json`.
 *
 * Returns `null` silently when the folder or test files do not exist (e.g. volumes
 * without local analysis yet or production builds before server upload).
 */
export const getCambridgeReadingAnalysis = cache(
  async (slug: string, test: number): Promise<CambridgeAnalysisBundle | null> => {
    const vol = volumeFromSlug(slug);
    if (vol === null || test < 1 || test > 10) return null;

    const bookCode = `C${vol}`;
    const dir = path.join(
      process.cwd(),
      'output',
      'ielts-analysis',
      `${bookCode}_Reading_analysis`
    );

    const [enFile, faFile, ckbFile] = await Promise.all([
      readJsonSafe(path.join(dir, `test${test}_analysis.json`)),
      readJsonSafe(path.join(dir, `test${test}_analysis.fa.json`)),
      readJsonSafe(path.join(dir, `test${test}_analysis.ckb.json`)),
    ]);

    if (!enFile || !Array.isArray(enFile.parts)) return null;

    const faMap = indexLocaleFile(faFile);
    const ckbMap = indexLocaleFile(ckbFile);
    const questions: CambridgeAnalysisQuestion[] = [];

    for (const partObj of enFile.parts) {
      if (!partObj || typeof partObj.part !== 'number' || !Array.isArray(partObj.questions)) {
        continue;
      }
      const partNum = Math.floor(partObj.part);
      for (const item of partObj.questions) {
        if (!item || typeof item.q !== 'number') continue;
        const q = Math.floor(item.q);
        const questionInPart =
          typeof item.questionInPart === 'number' ? Math.floor(item.questionInPart) : q;
        const enBrief = typeof item.brief === 'string' ? item.brief.trim() : '';
        const enComp = typeof item.comprehensive === 'string' ? item.comprehensive.trim() : '';
        const en: CambridgeAnalysisCopy = {
          brief: enBrief,
          comprehensive: enComp || enBrief,
        };
        const fa = faMap.get(q) ?? en;
        const ckb = ckbMap.get(q) ?? en;

        const entry: CambridgeAnalysisQuestion = {
          q,
          part: partNum,
          questionInPart,
          en,
          fa,
          ckb,
          locationHint: extractLocationHint(enBrief, enComp),
        };
        if (item.comprehensiveMissing === true) {
          entry.comprehensiveMissing = true;
        }
        if (
          item.chooseTwoGroup &&
          Array.isArray(item.chooseTwoGroup.globalQuestions) &&
          typeof item.chooseTwoGroup.slot === 'string'
        ) {
          const globals = item.chooseTwoGroup.globalQuestions.filter(
            (n): n is number => typeof n === 'number' && Number.isFinite(n)
          );
          if (globals.length > 0) {
            entry.chooseTwoGroup = {
              globalQuestions: globals,
              slot: item.chooseTwoGroup.slot,
            };
          }
        }
        questions.push(entry);
      }
    }

    if (questions.length === 0) return null;
    questions.sort((a, b) => a.q - b.q);

    return {
      slug,
      test,
      bookCode,
      hasFa: faMap.size > 0,
      hasCkb: ckbMap.size > 0,
      questions,
    };
  }
);
