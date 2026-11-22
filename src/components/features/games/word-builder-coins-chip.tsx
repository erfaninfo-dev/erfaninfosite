'use client';

import { IconCoin } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';

/**
 * Golden coin pill matching Flutter's `WordBuilderCoinsChip`
 * (`lib/features/word_builder/presentation/widgets/word_builder_coins_chip.dart`).
 */
export function WordBuilderCoinsChip({
  coins,
  locale,
  compact = false,
  className,
}: {
  coins: number;
  locale: Locale;
  compact?: boolean;
  className?: string;
}) {
  const formatted = new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(coins);

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border-[#FFB300] bg-[linear-gradient(90deg,#FFF8E1,#FFECB3)] text-[#5D4037] shadow-[0_3px_12px_rgba(255,152,0,0.3)] dark:border-[#FFB300]/60 dark:bg-[linear-gradient(90deg,#3E3228,#2D2640)] dark:text-[#FFF8E1]',
        compact ? 'gap-1.5 border-[1.8px] px-2.5 py-1' : 'gap-2 border-2 px-3.5 py-1.5',
        className
      )}
    >
      <IconCoin
        className={cn(
          'shrink-0 text-[#FFA000] drop-shadow-[0_0_5px_rgba(255,152,0,0.45)] dark:text-[#FFCA28]',
          compact ? 'size-5' : 'size-6'
        )}
      />
      <bdi
        dir="ltr"
        className={cn(
          'leading-none font-extrabold tracking-wide tabular-nums',
          compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
        )}
      >
        {formatted}
      </bdi>
    </div>
  );
}
