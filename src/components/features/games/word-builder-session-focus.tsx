'use client';

import { useEffect } from 'react';

/**
 * Tightens shell padding on the Word Builder session page so the tray and
 * controls fit in common desktop/phone viewports without scrolling.
 */
export function WordBuilderSessionFocus() {
  useEffect(() => {
    document.documentElement.dataset.wordBuilderSession = '';
    return () => {
      delete document.documentElement.dataset.wordBuilderSession;
    };
  }, []);
  return null;
}
