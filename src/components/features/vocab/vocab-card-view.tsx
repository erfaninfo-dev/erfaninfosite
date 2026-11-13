'use client';

import type { ReactNode } from 'react';

import { SpeakButton } from '@/components/features/vocab/speak-button';
import { IconBook, IconBookmark, IconFire } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { VocabSearchHit } from '@/lib/vocab/search-words';

function MarkButton({
  pressed,
  label,
  onClick,
  warm = false,
  children,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
  warm?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'grid size-10 place-items-center rounded-full',
        pressed
          ? warm
            ? 'bg-tertiary-container text-on-tertiary-container'
            : 'bg-primary-container text-on-primary-container'
          : 'bg-surface-3 text-on-surface-variant'
      )}
    >
      {children}
    </button>
  );
}

function sectionAccent(section: number): '1' | '4' {
  return section === 2 ? '1' : '4';
}

function placeLabel(card: VocabSearchHit): string {
  if (!card.section) return `U${card.unit}`;
  return `U${card.unit}  S${card.section}`;
}

export function VocabCardView({
  card,
  bookTitle,
  glossLang,
  uiRtl,
  numberLabel,
  labels,
  favorite,
  important,
  onFavorite,
  onImportant,
}: {
  card: VocabSearchHit;
  bookTitle: string;
  glossLang: 'fa' | 'ckb';
  uiRtl: boolean;
  numberLabel: string;
  labels: {
    example: string;
    important: string;
    favorite: string;
    pronounceWord: string;
    pronounceExample: string;
  };
  favorite: boolean;
  important: boolean;
  onFavorite: () => void;
  onImportant: () => void;
}) {
  const glossExample =
    card.exampleGloss && card.exampleGloss !== card.exampleEn ? card.exampleGloss : '';

  return (
    <article
      data-accent={sectionAccent(card.section)}
      dir="ltr"
      data-vocab-card=""
      className="jelly-card rounded-[1.5rem] px-3.5 pt-3.5 pb-2.5"
    >
      {bookTitle ? (
        <div className="mb-2.5 flex items-start gap-2">
          <IconBook className="mt-0.5 size-[1.125rem] shrink-0 text-[var(--accent)]" />
          <p className="text-on-surface-variant line-clamp-2 text-sm leading-snug font-bold">
            <bdi lang="en">{bookTitle}</bdi>
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <span className="h-7 w-1 shrink-0 rounded-lg bg-[var(--accent)]" />
        <span className="border-outline-variant/60 text-on-surface-variant bg-surface-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-xs font-bold">
          {numberLabel}
        </span>
        <h2 className="text-on-surface min-w-0 flex-1 text-xl leading-snug font-bold tracking-tight">
          <bdi lang="en">{card.word}</bdi>
        </h2>
        {card.type ? (
          <span className="rounded-[11px] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] px-2.5 py-1.5 text-xs font-bold text-[var(--accent)]">
            <bdi lang="en">{card.type}</bdi>
          </span>
        ) : null}
      </div>

      {card.meaningEn ? (
        <p className="text-on-surface mt-2.5 text-sm leading-snug">
          <bdi lang="en">{card.meaningEn}</bdi>
        </p>
      ) : null}

      {card.gloss ? (
        <p
          lang={glossLang}
          dir="rtl"
          className="text-primary mt-1.5 pr-6 text-right text-base leading-snug font-bold"
        >
          {card.gloss}
        </p>
      ) : null}

      {card.exampleEn || glossExample ? (
        <div className="bg-surface-3/80 mt-2.5 rounded-[14px] p-2.5">
          <p
            dir={uiRtl ? 'rtl' : 'ltr'}
            className={cn('text-on-surface text-sm font-bold', uiRtl && 'text-right')}
          >
            {labels.example}
          </p>
          {card.exampleEn ? (
            <p lang="en" className="text-on-surface-variant mt-1 text-sm italic">
              {card.exampleEn}
            </p>
          ) : null}
          {glossExample ? (
            <p lang={glossLang} dir="rtl" className="text-primary mt-1.5 pr-2 text-right text-sm font-bold">
              {glossExample}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1.5 flex items-center gap-1">
        <MarkButton pressed={favorite} label={labels.favorite} onClick={onFavorite}>
          <IconBookmark className={cn('size-5', favorite && 'fill-current')} />
        </MarkButton>
        <MarkButton pressed={important} label={labels.important} onClick={onImportant} warm>
          <IconFire className={cn('size-5', important && 'fill-current')} />
        </MarkButton>
        <SpeakButton text={card.word} label={labels.pronounceWord} />
        <SpeakButton text={card.exampleEn} label={labels.pronounceExample} voice />
        <p className="ms-auto text-xs font-bold text-[var(--accent)]">{placeLabel(card)}</p>
      </div>
    </article>
  );
}
