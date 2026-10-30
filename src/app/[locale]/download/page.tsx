import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Card } from '@/components/ui/card';
import { ExternalLink } from '@/components/ui/external-link';
import { IconAndroid, IconDownload, IconWindows } from '@/components/ui/icons';
import { Container, PageHeader, Prose, SectionHeading } from '@/components/ui/primitives';
import { Skeleton } from '@/components/ui/states';
import { releaseNoteFor } from '@/lib/api/normalize';
import { getAppUpdate } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { formatPlain } from '@/lib/i18n/format';
import { getTranslator } from '@/lib/i18n/messages';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/download'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: t('downloadTitle'),
    description: t('downloadSubtitle'),
    alternates: { canonical: `/${locale}/download` },
  };
}

export default async function DownloadPage({ params }: PageProps<'/[locale]/download'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container size="content">
      <PageHeader title={t('downloadTitle')} description={t('downloadSubtitle')} />
      <Suspense
        fallback={<Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />}
      >
        <Downloads locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Downloads({ locale }: { locale: Locale }) {
  const update = await getAppUpdate();
  const t = getTranslator(locale);
  const notes = releaseNoteFor(update.releaseNotes, locale);

  return (
    <div className="space-y-8">
      {/* Force-update is the app's own flag; surfaced here as a plain notice. */}
      {update.android.force || update.windows.force ? (
        <p
          role="status"
          className="border-tertiary/40 bg-tertiary-container/40 text-on-tertiary-container rounded-[var(--radius-card)] border px-5 py-4"
        >
          {t('aboutForcedUpdateNote')}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <PlatformCard
          icon={<IconAndroid className="size-6" />}
          platform="Android"
          /* Version numbers stay in Latin digits in every locale. */
          version={update.android.versionName}
          buildNumber={formatPlain(update.android.versionCode)}
          url={update.android.url}
          label={t('downloadAndroid')}
          versionLabel={t('aboutAppVersion', {
            version: update.android.versionName,
            buildNumber: formatPlain(update.android.versionCode),
          })}
        />
        <PlatformCard
          icon={<IconWindows className="size-6" />}
          platform="Windows"
          version={update.windows.versionName}
          buildNumber={formatPlain(update.windows.versionCode)}
          url={update.windows.url}
          label={t('downloadWindows')}
          versionLabel={t('aboutAppVersion', {
            version: update.windows.versionName,
            buildNumber: formatPlain(update.windows.versionCode),
          })}
        />
      </div>

      {/*
        Release notes are empty in the live API today, so the block appears only
        when there is something to show.
      */}
      {notes ? (
        <section>
          <SectionHeading>{t('releaseNotesTitle')}</SectionHeading>
          <Card>
            <Prose>
              <p className="whitespace-pre-wrap">{notes}</p>
            </Prose>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function PlatformCard({
  icon,
  platform,
  version,
  url,
  label,
  versionLabel,
}: {
  icon: React.ReactNode;
  platform: string;
  version: string;
  buildNumber: string;
  url: string;
  label: string;
  versionLabel: string;
}) {
  return (
    <Card className="flex flex-col">
      <div className="bg-secondary-container text-on-secondary-container mb-3 flex size-12 items-center justify-center rounded-[var(--radius-logo)]">
        {icon}
      </div>
      <h2 className="text-[length:var(--text-h4)]" lang="en">
        {platform}
      </h2>
      {version ? (
        <p className="text-on-surface-variant mt-1 text-[length:var(--text-label)]">
          {versionLabel}
        </p>
      ) : null}

      {/*
        The API serves these over plain http; the normalizer upgrades them to
        https so the browser does not block them as mixed content, and
        ExternalLink then checks the host against an allowlist.
      */}
      <div className="mt-auto pt-5">
        <ExternalLink
          href={url}
          className="bg-primary text-on-primary inline-flex min-h-[var(--size-button-md)] items-center justify-center gap-2 rounded-[var(--radius-button)] px-4 py-3 font-bold hover:brightness-110"
        >
          <IconDownload className="size-5" />
          {label}
        </ExternalLink>
      </div>
    </Card>
  );
}
