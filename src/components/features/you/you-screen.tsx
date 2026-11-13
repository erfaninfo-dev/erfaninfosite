import Link from 'next/link';
import type { Route } from 'next';

import { LearningGoalCard } from '@/components/features/you/learning-goal-card';
import { SectionLabel } from '@/components/features/you/section-label';
import { YouAccountSection, type YouAccountLabels } from '@/components/features/you/you-account-section';
import { YouNavCard } from '@/components/features/you/you-nav-card';
import { JellyIconBubble } from '@/components/features/you/jelly-icon-bubble';
import {
  IconInsights,
  IconLoop,
  IconMessage,
  IconSchool,
  IconUsers,
} from '@/components/ui/icons';
import type { Account } from '@/lib/auth/account';
import type { TeacherMessagesPreview } from '@/lib/auth/you-fetch';
import type { Locale } from '@/lib/i18n/config';
import { learningGoalCopy } from '@/lib/you/learning-goal-copy';
import { localeHref } from '@/lib/nav';

export type YouScreenLabels = YouAccountLabels & {
  youPageTitle: string;
  granted: string;
  youSectionMessages: string;
  youSectionMessagesHub: string;
  youSectionMessagesSubtitle: string;
  youSectionMessagesSubtitleHub: string;
  teacherMessagesNoTeacher: string;
  teacherMessagesEmpty: string;
  youSectionAdmin: string;
  adminUserManagement: string;
  youAdminPanelSubtitle: string;
  youSectionProgress: string;
  youSectionProgressSubtitle: string;
  statsMyProgress: string;
  youSectionReview: string;
  youSectionReviewSubtitle: string;
  tabReview: string;
  youClassSessionsTitle: string;
  youClassSessionsSubtitle: string;
  teacherOpenPanel: string;
  youTeacherPanelSubtitle: string;
};

export function YouScreen({
  locale,
  account,
  messages,
  labels,
  granted,
}: {
  locale: Locale;
  account: Account | null;
  messages: TeacherMessagesPreview | null;
  labels: YouScreenLabels;
  granted: boolean;
}) {
  const goalCopy = learningGoalCopy(locale);
  const isTeacherPanel = account?.isTeacher || account?.isAdmin;
  const hasTeacher = account?.teacherUserId != null;
  const showLearnerMessages =
    account != null && !isTeacherPanel && (hasTeacher || account.studentAccess);

  const href = (path: string) => localeHref(locale, path as Route);

  return (
    <div className="hero-wash -mt-8 min-h-[calc(100dvh-var(--size-bottom-nav))] pt-6 pb-8">
      <div className="page-gutter mx-auto flex w-full max-w-[var(--container-quiz)] flex-col gap-5">
        <h1 className="text-on-surface px-1 text-xl font-extrabold">{labels.youPageTitle}</h1>

        {granted && account?.studentAccess ? (
          <p className="text-primary px-1 font-bold">{labels.granted}</p>
        ) : null}

        <YouAccountSection locale={locale} account={account} labels={labels} />

        {showLearnerMessages ? (
          <section>
            {messages && messages.peerCount > 1 ? (
              <SectionLabel>{labels.youSectionMessagesHub}</SectionLabel>
            ) : (
              <SectionLabel>{labels.youSectionMessages}</SectionLabel>
            )}
            {messages &&
            messages.peerCount === 0 &&
            !messages.lastBody &&
            !hasTeacher ? (
              <div className="jelly-card flex items-center gap-3.5 rounded-[var(--radius-card)] p-4">
                <JellyIconBubble tone="primary">
                  <IconMessage className="size-5" />
                </JellyIconBubble>
                <p className="text-on-surface text-sm font-semibold leading-snug">
                  {labels.teacherMessagesNoTeacher}
                </p>
              </div>
            ) : (
              <Link
                href={href('/you/messages')}
                className="jelly-card block rounded-[var(--radius-card)] p-4 no-underline shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center gap-3.5">
                  <JellyIconBubble tone="primary">
                    <IconMessage className="size-5" />
                  </JellyIconBubble>
                  <span className="min-w-0 flex-1">
                    <span className="text-on-surface block font-extrabold">
                      {messages?.teacherName?.trim() || labels.youSectionMessages}
                    </span>
                    <span className="text-on-surface-variant mt-0.5 block text-sm leading-snug">
                      {messages && messages.peerCount > 1
                        ? labels.youSectionMessagesSubtitleHub
                        : labels.youSectionMessagesSubtitle}
                    </span>
                  </span>
                  {messages && messages.unreadCount > 0 ? (
                    <span className="bg-primary-container text-on-primary-container min-w-8 rounded-full px-2 py-1 text-center text-xs font-extrabold">
                      {messages.unreadCount > 99 ? '99+' : messages.unreadCount}
                    </span>
                  ) : null}
                </div>
                {messages?.lastBody ? (
                  <p className="bg-surface-2 text-on-surface mt-3 line-clamp-3 rounded-2xl px-3.5 py-3 text-sm leading-snug">
                    {messages.lastBody}
                  </p>
                ) : (
                  <p className="text-on-surface-variant mt-2 text-sm">{labels.teacherMessagesEmpty}</p>
                )}
              </Link>
            )}
          </section>
        ) : null}

        {account?.isAdmin ? (
          <section>
            <SectionLabel>{labels.youSectionAdmin}</SectionLabel>
            <YouNavCard
              href={href('/admin/users')}
              title={labels.adminUserManagement}
              subtitle={labels.youAdminPanelSubtitle}
              tone="error"
              icon={<IconUsers className="size-5" />}
            />
          </section>
        ) : null}

        <section>
          <SectionLabel>{labels.youSectionProgress}</SectionLabel>
          <YouNavCard
            href={href('/stats')}
            title={labels.statsMyProgress}
            subtitle={labels.youSectionProgressSubtitle}
            tone="tertiary"
            icon={<IconInsights className="size-5" />}
          />
        </section>

        <section>
          <SectionLabel>{goalCopy.sectionTitle}</SectionLabel>
          <LearningGoalCard locale={locale} />
        </section>

        {!isTeacherPanel && hasTeacher ? (
          <section>
            <SectionLabel>{labels.youClassSessionsTitle}</SectionLabel>
            <YouNavCard
              href={href('/student-panel?tab=sessions')}
              title={labels.youClassSessionsTitle}
              subtitle={labels.youClassSessionsSubtitle}
              tone="primary"
              icon={<IconSchool className="size-5" />}
            />
          </section>
        ) : null}

        {isTeacherPanel ? (
          <section>
            <SectionLabel>{labels.teacherOpenPanel}</SectionLabel>
            <YouNavCard
              href={href('/teacher')}
              title={labels.teacherOpenPanel}
              subtitle={labels.youTeacherPanelSubtitle}
              tone="tertiary"
              icon={<IconSchool className="size-5" />}
            />
          </section>
        ) : null}

        <section>
          <SectionLabel>{labels.youSectionReview}</SectionLabel>
          <YouNavCard
            href={href('/review')}
            title={labels.tabReview}
            subtitle={labels.youSectionReviewSubtitle}
            tone="primary"
            icon={<IconLoop className="size-5" />}
          />
        </section>
      </div>
    </div>
  );
}
