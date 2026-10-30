/**
 * Live contract drift check.
 *
 * Calls every public endpoint the website uses with a real request and
 * validates the response against the zod schema the site relies on. If the
 * backend renames or retypes a field, this fails loudly with a readable diff
 * instead of the website quietly rendering blanks.
 *
 *   pnpm contract:check
 *
 * Run it in CI and before every deploy. This is the mechanism that guarantees
 * the website and the Flutter app never silently diverge.
 *
 * It is deliberately standalone: it does not import queries.ts, because that
 * module is server-only and wrapped in Next's cache. A drift check must see the
 * real response every time.
 */
import { z } from 'zod';

import * as S from '../src/lib/api/schemas';

const BASE = (process.env.WORDSAPI_BASE_URL ?? 'https://erfaninfo.com/wordsapi').replace(
  /\/+$/,
  ''
);
const USER_AGENT = 'ErfanAcademyWeb-ContractCheck/1.0 (+https://erfaninfo.com)';
const TIMEOUT_MS = 30_000;

type Check = {
  name: string;
  endpoint: string;
  params?: Record<string, string | number>;
  schema: z.ZodType<unknown>;
  /** Minimum rows we expect. 0 means an empty array is legitimate. */
  minItems?: number;
  /** Documented facts worth re-asserting, beyond the schema. */
  assert?: (data: never) => string | null;
  note?: string;
};

/**
 * Ids used for the parameterised endpoints. These are stable catalog entries,
 * but if one is ever deleted the check says so clearly rather than failing with
 * a confusing schema error.
 */
const SAMPLE = {
  bookId: 2,
  bookUnit: 1,
  sectionedBookId: 1,
  grammarBookId: 1,
  grammarUnitId: 1,
  grammarTopicId: 1,
  speakingTopicId: 5,
  speakingModelId: 37,
} as const;

const CHECKS: Check[] = [
  {
    name: 'books',
    endpoint: 'books.php',
    schema: S.booksSchema,
    minItems: 1,
    assert: (data: S.RawBook[]) =>
      data.some((b) => b.series_title) ? null : 'no book has a series_title',
  },
  {
    name: 'units',
    endpoint: 'units.php',
    params: { book_id: SAMPLE.bookId },
    schema: S.unitsSchema,
    minItems: 1,
  },
  {
    name: 'words',
    endpoint: 'words.php',
    params: { book_id: SAMPLE.bookId },
    schema: S.wordsSchema,
    minItems: 1,
    note: 'the heaviest call: 176 KB–864 KB depending on the book',
  },
  {
    name: 'sections',
    endpoint: 'sections.php',
    params: { book_id: SAMPLE.sectionedBookId, unit: SAMPLE.bookUnit },
    schema: S.sectionsSchema,
    minItems: 0,
    note: 'requires book_id AND unit — book_id alone returns 400',
  },
  {
    name: 'unit_samples',
    endpoint: 'unit_samples.php',
    params: { book_id: SAMPLE.bookId, unit: SAMPLE.bookUnit },
    schema: S.unitSamplesSchema,
    minItems: 0,
    note: 'returns quoted strings for numeric fields, unlike every other endpoint',
  },
  { name: 'book_pdfs', endpoint: 'book_pdfs.php', schema: S.bookPdfsSchema, minItems: 0 },
  {
    name: 'grammar_books',
    endpoint: 'grammar_books.php',
    schema: S.grammarBooksSchema,
    minItems: 1,
  },
  {
    name: 'grammar_units',
    endpoint: 'grammar_units.php',
    params: { book_id: SAMPLE.grammarBookId },
    schema: S.grammarUnitsSchema,
    minItems: 1,
  },
  {
    name: 'grammar_unit_texts',
    endpoint: 'grammar_unit_texts.php',
    params: { unit_id: SAMPLE.grammarUnitId },
    schema: S.grammarUnitTextsSchema,
    minItems: 0,
  },
  {
    name: 'grammar_topics',
    endpoint: 'grammar_topics.php',
    schema: S.grammarTopicsSchema,
    minItems: 1,
    assert: (data: S.RawGrammarTopic[]) =>
      data.every((t) => typeof t.topic_id === 'number')
        ? null
        : 'topic_id missing — routing depends on it',
  },
  {
    name: 'grammar_questions',
    endpoint: 'grammar_questions.php',
    params: { topic_id: SAMPLE.grammarTopicId },
    schema: S.grammarQuestionsSchema,
    minItems: 1,
    assert: (data: S.RawGrammarQuestion[]) => {
      // Scoring depends entirely on correct_answer being an option key.
      const bad = data.filter(
        (q) => !/^option[1-4]$/i.test((q.correct_answer ?? '').trim())
      );
      return bad.length === 0
        ? null
        : `${bad.length} question(s) have a correct_answer that is not option1–option4 ` +
            `(first: id ${bad[0]?.id}, value ${JSON.stringify(bad[0]?.correct_answer)}). ` +
            `Quiz scoring would disagree with the app.`;
    },
  },
  {
    name: 'grammar_topic_pdfs',
    endpoint: 'grammar_topic_pdfs.php',
    schema: S.grammarTopicPdfsSchema,
    minItems: 0,
  },
  {
    name: 'speaking_topics',
    endpoint: 'speaking_topics.php',
    schema: S.speakingTopicsSchema,
    minItems: 1,
  },
  {
    name: 'speaking_model_questions',
    endpoint: 'speaking_model_questions.php',
    schema: S.speakingModelsSchema,
    minItems: 1,
  },
  {
    name: 'speaking_questions (topic_id)',
    endpoint: 'speaking_questions.php',
    params: { topic_id: SAMPLE.speakingTopicId },
    schema: S.speakingTopicQuestionsSchema,
    note: 'returns a {topic, questions} envelope',
  },
  {
    name: 'speaking_questions (model_id)',
    endpoint: 'speaking_questions.php',
    params: { model_id: SAMPLE.speakingModelId },
    schema: S.speakingModelQuestionsSchema,
    note: 'returns a {model, questions} envelope — a different shape',
  },
  {
    name: 'speaking_topic_ideas',
    endpoint: 'speaking_topic_ideas.php',
    params: { topic_id: SAMPLE.speakingTopicId },
    schema: S.speakingTopicIdeasSchema,
  },
  {
    name: 'game_word_categories',
    endpoint: 'game_word_categories.php',
    schema: S.gameCategoriesSchema,
    minItems: 1,
    note: 'about 400 KB; names use name_ckb while nested words use meaning_kur',
  },
  {
    name: 'app_update',
    endpoint: 'app_update.php',
    schema: S.appUpdateSchema,
    assert: (data: S.RawAppUpdate) =>
      data.android_version_name ? null : 'android_version_name is empty',
  },
];

type Result = {
  name: string;
  ok: boolean;
  bytes: number;
  ms: number;
  problems: string[];
};

function buildUrl(endpoint: string, params?: Record<string, string | number>): string {
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));
  return url.toString();
}

async function runCheck(check: Check): Promise<Result> {
  const url = buildUrl(check.endpoint, check.params);
  const started = Date.now();
  const problems: string[] = [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
    const body = await response.text();
    const ms = Date.now() - started;

    if (!response.ok) {
      return {
        name: check.name,
        ok: false,
        bytes: body.length,
        ms,
        problems: [`HTTP ${response.status}: ${body.slice(0, 200)}`],
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      return {
        name: check.name,
        ok: false,
        bytes: body.length,
        ms,
        problems: [`content-type is "${contentType}", not JSON: ${body.slice(0, 120)}`],
      };
    }

    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return {
        name: check.name,
        ok: false,
        bytes: body.length,
        ms,
        problems: [`body is not valid JSON: ${body.slice(0, 120)}`],
      };
    }

    const parsed = check.schema.safeParse(json);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 8)) {
        const path = issue.path.join('.') || '(root)';
        problems.push(`${path}: ${issue.message}`);
      }
      if (parsed.error.issues.length > 8) {
        problems.push(`…and ${parsed.error.issues.length - 8} more`);
      }
    } else {
      if (check.minItems !== undefined && Array.isArray(parsed.data)) {
        if (parsed.data.length < check.minItems) {
          problems.push(
            `expected at least ${check.minItems} item(s), got ${parsed.data.length}`
          );
        }
      }
      if (check.assert) {
        const message = (check.assert as (d: unknown) => string | null)(parsed.data);
        if (message) problems.push(message);
      }
    }

    return { name: check.name, ok: problems.length === 0, bytes: body.length, ms, problems };
  } catch (error) {
    return {
      name: check.name,
      ok: false,
      bytes: 0,
      ms: Date.now() - started,
      problems: [
        error instanceof Error && error.name === 'AbortError'
          ? `timed out after ${TIMEOUT_MS}ms`
          : `request failed: ${String(error)}`,
      ],
    };
  } finally {
    clearTimeout(timer);
  }
}

/** A failure that says nothing about the contract — worth one retry. */
function isTransient(problem: string): boolean {
  return (
    problem.startsWith('request failed') ||
    problem.startsWith('timed out') ||
    /^HTTP 5\d\d/.test(problem) ||
    problem.startsWith('content-type is')
  );
}

function kb(bytes: number): string {
  return bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`;
}

async function main() {
  console.log(`Contract check against ${BASE}\n`);

  const results: Result[] = [];
  // Serial, to stay a polite client of a shared host.
  for (const check of CHECKS) {
    let result = await runCheck(check);

    /*
     * One retry, for transport failures only — a shared host hiccups, and a
     * flaky gate teaches people to ignore it. A schema mismatch is never
     * retried: that is the drift this script exists to catch, and retrying it
     * would only hide it.
     */
    if (!result.ok && result.problems.some(isTransient)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      result = await runCheck(check);
    }
    results.push(result);
    const mark = result.ok ? 'ok  ' : 'FAIL';
    console.log(
      `${mark} ${result.name.padEnd(30)} ${kb(result.bytes).padStart(8)}  ${String(result.ms).padStart(6)} ms`
    );
    for (const problem of result.problems) console.log(`       ${problem}`);
    if (check.note && result.ok) console.log(`       note: ${check.note}`);
  }

  const failed = results.filter((r) => !r.ok);
  const slowest = [...results].sort((a, b) => b.ms - a.ms)[0];
  const total = results.reduce((sum, r) => sum + r.bytes, 0);

  console.log(
    `\n${results.length - failed.length}/${results.length} passed · ` +
      `${kb(total)} transferred · slowest ${slowest?.name} at ${slowest?.ms} ms`
  );

  if (failed.length > 0) {
    console.error(
      `\nContract drift detected in ${failed.length} endpoint(s). ` +
        `The backend shape changed, or an endpoint is down.\n` +
        `Fix the schema in src/lib/api/schemas.ts and the adapter in normalize.ts, ` +
        `then re-run. Do not deploy until this passes.`
    );
    process.exit(1);
  }

  console.log('\nNo drift. The website and the app agree on every field.');
}

void main();
