import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { CardGrid, CardLink } from '@/components/ui/card';
import {
  IconBook,
  IconDownload,
  IconGrammar,
  IconPlay,
  IconSparkle,
  IconSpeaking,
} from '@/components/ui/icons';
import { Badge, Container, SectionHeading } from '@/components/ui/primitives';
import { CardGridSkeleton } from '@/components/ui/states';
import { getGrammarTopics } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erfaninfo.com';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);

  return {
    title: 'Erfan Academy',
    description: t('siteTagline'),
    alternates: { canonical: `/${locale}` },
  };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  /*
   * JSON-LD describing the site as a learning resource. Built from static
   * strings only — no API content — so it cannot leak data or go stale.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Erfan Academy',
    url: `${SITE_URL}/${locale}`,
    description: t('siteTagline'),
    inLanguage: ['en', 'fa', 'ckb'],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Static object, serialised here — never API content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container>
        <section className="mb-14">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Image
              src="/brand/logo.png"
              alt=""
              width={88}
              height={88}
              priority
              className="rounded-[var(--radius-card)]"
            />
            <div className="min-w-0">
              <h1 className="text-[length:var(--text-display)]">Erfan Academy</h1>
              <p className="text-on-surface-variant mt-3 max-w-[var(--container-prose)] text-[length:var(--text-body-lg)]">
                {t('siteTagline')}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={localeHref(locale, '/books')}>
              <IconBook className="size-5" />
              {t('tabVocabulary')}
            </ButtonLink>
            <ButtonLink href={localeHref(locale, '/grammar')} variant="secondary">
              <IconGrammar className="size-5" />
              {t('tabGrammar')}
            </ButtonLink>
            <ButtonLink href={localeHref(locale, '/download')} variant="ghost">
              <IconDownload className="size-5" />
              {t('downloadTitle')}
            </ButtonLink>
          </div>
        </section>

        <section className="mb-14">
          <SectionHeading>{t('primaryNavigation')}</SectionHeading>
          <CardGrid min="15rem">
            <EntryCard
              href={localeHref(locale, '/books')}
              title={t('tabVocabulary')}
              body={t('allWordsChip')}
              icon={<IconBook className="size-6" />}
            />
            <EntryCard
              href={localeHref(locale, '/grammar')}
              title={t('grammarPracticeTitle')}
              body={t('grammarPracticeSubtitle')}
              icon={<IconGrammar className="size-6" />}
            />
            <EntryCard
              href={localeHref(locale, '/speaking')}
              title={t('speakingPart1Title')}
              body={t('speakingHomeCardSubtitle')}
              icon={<IconSpeaking className="size-6" />}
            />
            <EntryCard
              href={localeHref(locale, '/play')}
              title={t('wordBuilderTitle')}
              body={t('wordBuilderNormalSubtitle')}
              icon={<IconPlay className="size-6" />}
            />
          </CardGrid>
        </section>

        {/*
          The heading lives inside NewTopics, not here: `is_new` is editorial
          and is often false for every topic, and a heading with nothing under
          it is worse than no section at all.
        */}
        <Suspense fallback={<CardGridSkeleton count={4} />}>
          <NewTopics locale={locale} />
        </Suspense>
      </Container>
    </>
  );
}

function EntryCard({
  href,
  title,
  body,
  icon,
}: {
  href: Parameters<typeof CardLink>[0]['href'];
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <CardLink href={href}>
      <div className="bg-secondary-container text-on-secondary-container mb-3 flex size-12 items-center justify-center rounded-[var(--radius-logo)]">
        {icon}
      </div>
      <h3 className="text-on-surface text-[length:var(--text-h4)]">{title}</h3>
      <p className="text-on-surface-variant mt-1.5 text-[length:var(--text-label)]">
        {body}
      </p>
    </CardLink>
  );
}

/**
 * "What's new", driven by `grammar_topics.is_new` as the brief specifies.
 *
 * If nothing is flagged new the section renders nothing rather than an empty
 * heading — the flag is editorial and is often all false.
 */
async function NewTopics({ locale }: { locale: Locale }) {
  const topics = await getGrammarTopics();
  const t = getTranslator(locale);

  const fresh = topics.filter((topic) => topic.isNew).slice(0, 8);
  if (fresh.length === 0) return null;

  return (
    <section>
      <SectionHeading>{t('releaseNotesTitle')}</SectionHeading>
      <CardGrid min="14rem">
        {fresh.map((topic) => (
          <CardLink
            key={topic.id}
            href={localeHref(locale, `/grammar/topics/${topic.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-on-surface text-[length:var(--text-h4)]">
                <bdi lang="en">{topic.topic}</bdi>
              </h3>
              <IconSparkle className="text-tertiary size-5 shrink-0" />
            </div>
            <div className="mt-auto pt-4">
              <Badge tone="new">{t('badgeNew')}</Badge>
            </div>
          </CardLink>
        ))}
      </CardGrid>
    </section>
  );
}
