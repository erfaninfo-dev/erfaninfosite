'use client';

import { useEffect } from 'react';

/**
 * Full-screen grammar quiz, like the app: no site header or bottom nav.
 */
export function GrammarQuizFocus() {
  useEffect(() => {
    document.documentElement.dataset.grammarQuiz = '';
    return () => {
      delete document.documentElement.dataset.grammarQuiz;
    };
  }, []);
  return null;
}