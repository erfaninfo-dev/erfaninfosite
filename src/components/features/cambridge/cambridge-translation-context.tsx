'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type { CambridgeTranslationPair } from '@/lib/cambridge/api';

export type CambridgeTranslationLang = 'off' | 'fa' | 'ckb';

type TranslationCtx = {
  lang: CambridgeTranslationLang;
  lookup: (en: string | undefined | null) => string | null;
};

const CambridgeTranslationContext = createContext<TranslationCtx>({
  lang: 'off',
  lookup: () => null,
});

function normalizeLookupKey(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function CambridgeTranslationProvider({
  lang,
  byEn,
  children,
}: {
  lang: CambridgeTranslationLang;
  byEn: Record<string, CambridgeTranslationPair> | null;
  children: ReactNode;
}) {
  const normalizedMap = useMemo(() => {
    const map = new Map<string, CambridgeTranslationPair>();
    if (!byEn) return map;
    for (const [k, v] of Object.entries(byEn)) {
      map.set(normalizeLookupKey(k), v);
    }
    return map;
  }, [byEn]);

  const value = useMemo<TranslationCtx>(() => {
    if (lang === 'off' || !byEn) {
      return { lang: 'off', lookup: () => null };
    }
    return {
      lang,
      lookup: (en) => {
        if (!en || !en.trim()) return null;
        const direct = byEn[en] ?? normalizedMap.get(normalizeLookupKey(en));
        if (!direct) return null;
        const translated = lang === 'ckb' ? direct.ckb : direct.fa;
        return translated && translated.trim() ? translated : null;
      },
    };
  }, [lang, byEn, normalizedMap]);

  return (
    <CambridgeTranslationContext.Provider value={value}>
      {children}
    </CambridgeTranslationContext.Provider>
  );
}

export function useCambridgeTranslation() {
  return useContext(CambridgeTranslationContext);
}

function renderInlineFormatted(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\{\d+\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-[#0F4C50]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (/^\{\d+\}$/.test(part)) {
      return (
        <span
          key={i}
          dir="ltr"
          className="mx-1 inline-flex items-center rounded border border-[#077F83]/40 bg-white px-1.5 py-0 text-[0.82em] font-bold text-[#077F83]"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Renders the Persian (`fa`) or Central Kurdish (`ckb`) translation line directly
 * beneath an English Cambridge block when Practice Mode translation is enabled.
 */
export function CambridgeTranslationLine({
  text,
  className,
  block = false,
}: {
  text: string | undefined | null;
  className?: string;
  block?: boolean;
}) {
  const { lang, lookup } = useCambridgeTranslation();
  if (lang === 'off') return null;
  const translated = lookup(text);
  if (!translated) return null;

  return (
    <span
      dir="rtl"
      lang={lang}
      className={cn(
        'mt-1.5 block rounded-[6px] border-r-2 border-[#077F83]/60 bg-[#F0FAF9] px-3 py-1.5 text-right font-[var(--font-sans)] text-[13.5px] leading-[1.8] font-normal text-[#1E4E52]',
        block && 'mb-2 py-2 text-[14px]',
        className
      )}
    >
      {renderInlineFormatted(translated)}
    </span>
  );
}
