'use client';

import { useEffect, useState } from 'react';

/**
 * Favorite and important marks, stored in this browser.
 *
 * The app keeps the same two sets locally and uploads them only after sign-in.
 * There is no account on the site, so these stay on this device.
 */

const FAV_KEY = 'erfan_favorite_word_ids';
const IMP_KEY = 'erfan_important_word_ids';
const UNIMP_KEY = 'erfan_unimportant_word_ids';

function readIds(key: string): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is number => typeof id === 'number' && id > 0);
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: number[]) {
  localStorage.setItem(key, JSON.stringify([...new Set(ids)].sort((a, b) => a - b)));
}

export function useWordMarks() {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [important, setImportant] = useState<number[]>([]);
  const [unimportant, setUnimportant] = useState<number[]>([]);

  useEffect(() => {
    setFavorites(readIds(FAV_KEY));
    setImportant(readIds(IMP_KEY));
    setUnimportant(readIds(UNIMP_KEY));
  }, []);

  function toggleFavorite(id: number) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      writeIds(FAV_KEY, next);
      return next;
    });
  }

  function toggleImportant(id: number, fromBook: boolean) {
    const marked = unimportant.includes(id) ? false : important.includes(id) ? true : fromBook;
    if (marked) {
      const nextImportant = important.filter((item) => item !== id);
      const nextUnimportant = unimportant.includes(id) ? unimportant : [...unimportant, id];
      writeIds(IMP_KEY, nextImportant);
      writeIds(UNIMP_KEY, nextUnimportant);
      setImportant(nextImportant);
      setUnimportant(nextUnimportant);
      return;
    }
    const nextUnimportant = unimportant.filter((item) => item !== id);
    const nextImportant = important.includes(id) ? important : [...important, id];
    writeIds(IMP_KEY, nextImportant);
    writeIds(UNIMP_KEY, nextUnimportant);
    setImportant(nextImportant);
    setUnimportant(nextUnimportant);
  }

  return {
    isFavorite: (id: number) => favorites.includes(id),
    isImportant: (id: number, fromBook: boolean) =>
      unimportant.includes(id) ? false : important.includes(id) ? true : fromBook,
    toggleFavorite,
    toggleImportant,
  };
}
