import 'server-only';

import type { ReviewViewLabels } from '@/components/features/you/review-view';
import type { StatsViewLabels } from '@/components/features/you/stats-view';
import type { StudentClassSessionsLabels } from '@/components/panel/student-class-sessions-view';
import type { Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';

export function buildStatsLabels(locale: Locale): StatsViewLabels {
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  return {
    tabVocab: t('statsTabVocab'),
    tabGrammar: t('statsTabGrammar'),
    tabProgress: t('statsTabProgress'),
    signInTitle: t('grammarSignInRequiredTitle'),
    vocabSignIn: t('vocabQuizHistorySignIn'),
    grammarSignIn: t('grammarSignInRequiredBody'),
    goToAuth: t('goToAuth'),
    vocabEmpty: t('vocabQuizHistoryEmpty'),
    grammarEmpty: t('vocabQuizHistoryEmpty'),
    unitsTemplate: raw('vocabQuizHistoryUnitsLine'),
    correctWrongTemplate: raw('vocabQuizCorrectWrongLine'),
    detailTitle: t('vocabQuizResultDetailTitle'),
    wrongAnswers: t('vocabQuizMistakesTitle'),
    mistakesEmpty: t('vocabQuizMistakesEmpty'),
    correctLabel: t('vocabQuizResultCorrect'),
    incorrectLabel: t('vocabQuizResultIncorrect'),
    close: t('cancel'),
    sortNewest: t('grammarSortNewest'),
    sortScore: t('myResults'),
    streakDaysTemplate: raw('streakDays'),
    studiedToday: t('statsStudiedToday'),
    studyToKeepStreak: t('statsStudyToKeepStreak'),
    longest: t('longest'),
    totalDays: t('totalDays'),
    daysOnlyTemplate: raw('statsDaysOnly'),
    wordMastery: t('wordMastery'),
    mastered: t('mastered'),
    learning: t('learning'),
    seenOnce: t('seenOnce'),
    wordsStudiedTotalTemplate: raw('statsWordsStudiedTotal'),
    last7Days: t('last7Days'),
    wordsReviewedPerDay: t('wordsReviewedPerDay'),
    quizInsights: t('quizInsights'),
    vocabAndGrammar: t('vocabAndGrammar'),
    insightsSubtitle: t('statsInsightsCardSubtitle'),
    vocabDeviceAccuracyTemplate: raw('statsVocabDeviceAccuracy'),
    allTime: t('allTime'),
    totalReviews: t('totalReviews'),
    studyDays: t('studyDays'),
    errorGeneric: t('errorGeneric'),
  };
}

export function buildReviewLabels(locale: Locale): ReviewViewLabels {
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  return {
    title: t('reviewToday'),
    dueCountTemplate: raw('dueCount'),
    wordsProgressTemplate: raw('wordsProgress'),
    answer: t('answer'),
    translateThisWord: t('translateThisWord'),
    tapToSeeAnswer: t('tapToSeeAnswer'),
    tapCardToReveal: t('tapCardToReveal'),
    howWellKnew: t('howWellKnew'),
    ratingAgain: t('srsRatingAgain'),
    ratingHard: t('srsRatingHard'),
    ratingGood: t('srsRatingGood'),
    ratingEasy: t('srsRatingEasy'),
    nextDaysTemplate: raw('nextDaysShort'),
    pronounce: t('pronounce'),
    speaking: t('speaking'),
    noWordsDueTitle: t('noWordsDueTitle'),
    noWordsDueBodyFlashcards: t('noWordsDueBodyFlashcards'),
    noWordsDueBodyGreatTemplate: raw('noWordsDueBodyGreat'),
    sessionComplete: t('sessionComplete'),
    youReviewedTodayTemplate: raw('youReviewedToday'),
    tabHome: t('tabHome'),
  };
}

export function buildClassSessionsLabels(locale: Locale): StudentClassSessionsLabels {
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  return {
    personalTab: t('studentPersonalClassTab'),
    weeklyScheduleTab: t('teacherTabWeeklySchedule'),
    sessionsSubtitle: t('youClassSessionsSubtitle'),
    groupSubtitle: t('studentGroupClassSubtitle'),
    sessionsEmpty: t('youClassSessionsEmpty'),
    scheduleSubtitle: t('youClassScheduleSubtitle'),
    scheduleEmpty: t('classScheduleEmpty'),
    termTitleTemplate: raw('teacherClassTermTitle'),
    termSessionsProgressTemplate: raw('teacherClassTermSessionsProgress'),
    sessionHeadingTemplate: raw('teacherClassSessionHeading'),
    paid: t('classTermPaymentPaid'),
    unpaid: t('classTermPaymentUnpaid'),
  };
}
