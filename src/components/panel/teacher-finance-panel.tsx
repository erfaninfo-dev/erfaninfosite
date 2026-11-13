import Link from 'next/link';
import type { Route } from 'next';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import type { TeacherFinancialSummary } from '@/lib/auth/panel-types';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function formatMoney(amount: number, locale: Locale, currency: string) {
  if (currency === 'IRR' || currency === 'IRT') {
    return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
      maximumFractionDigits: 0,
    }).format(amount);
  }
  try {
    return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

export function TeacherFinancePanel({
  locale,
  data,
}: {
  locale: Locale;
  data: TeacherFinancialSummary;
}) {
  const t = getTranslator(locale);
  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const unit =
    data.currencyCode === 'USD' ? t('financialCurrencyUsd') : t('financialCurrencyIrr');

  if (!data.pricingAvailable) {
    return (
      <div className="jelly-card rounded-[var(--radius-card)] p-4">
        <p className="text-on-surface font-extrabold">{t('teacherFinanceServerSetupTitle')}</p>
        <p className="text-on-surface-variant mt-2 text-sm">{t('teacherFinanceServerSetupBody')}</p>
      </div>
    );
  }

  const totals = data.totals;
  const allZero = totals.received === 0 && totals.unpaid === 0 && data.byStudent.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {data.periodLabel ? (
        <p className="text-on-surface-variant text-sm font-semibold">{data.periodLabel}</p>
      ) : null}

      <div className="jelly-card grid grid-cols-2 gap-3 rounded-[var(--radius-card)] p-4 sm:grid-cols-4">
        <Stat label={t('teacherFinanceBreakdownStudents')} value={numbers.format(data.byStudent.length)} />
        <Stat label={t('teacherPanelTabFinance')} value={formatMoney(totals.received, locale, data.currencyCode)} suffix={unit} />
        <Stat label={t('teacherFinanceStudentUnpaidBadge')} value={formatMoney(totals.unpaid, locale, data.currencyCode)} suffix={unit} />
        <Stat label={t('youClassSessionsTitle')} value={numbers.format(totals.sessionCount)} />
      </div>

      {totals.received === 0 && totals.unpaid === 0 && data.byStudent.some((s) => s.sessionPrice <= 0) ? (
        <p className="text-on-surface-variant text-sm">{t('teacherFinanceAllZeroHint')}</p>
      ) : null}

      {allZero ? (
        <p className="text-on-surface-variant font-semibold">{t('teacherFinanceEmpty')}</p>
      ) : (
        <div>
          <h2 className="text-on-surface mb-2 text-sm font-extrabold">{t('teacherFinanceBreakdownStudents')}</h2>
          <ul className="flex flex-col gap-2">
            {data.byStudent.map((row) => (
              <li key={row.studentId}>
                <Link
                  href={localeHref(locale, `/teacher/student/${row.studentId}` as Route)}
                  className="jelly-card flex items-center gap-3 rounded-[var(--radius-card)] p-3 no-underline"
                >
                  <ProfileAvatar avatarId={row.avatar} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="text-on-surface block truncate font-extrabold">
                      {row.displayName || `#${row.studentId}`}
                    </span>
                    <span className="text-on-surface-variant text-sm">
                      {numbers.format(row.sessionCount)} · {formatMoney(row.received, locale, data.currencyCode)}
                      {row.unpaid > 0
                        ? ` · ${t('teacherFinanceStudentUnpaidBadge')}: ${formatMoney(row.unpaid, locale, data.currencyCode)}`
                        : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <p className="text-on-surface-variant text-xs font-semibold">{label}</p>
      <p className="text-on-surface mt-0.5 text-base font-extrabold" dir="ltr">
        {value}
        {suffix ? <span className="text-on-surface-variant ms-1 text-xs font-semibold">{suffix}</span> : null}
      </p>
    </div>
  );
}
