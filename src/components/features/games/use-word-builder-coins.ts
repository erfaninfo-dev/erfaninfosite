'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  COINS_INITIAL_BALANCE,
  COINS_STORAGE_KEY,
} from '@/lib/game/word-builder/constants';

function readCoins(): number {
  try {
    const raw = localStorage.getItem(COINS_STORAGE_KEY);
    if (raw === null) return COINS_INITIAL_BALANCE;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  } catch {
    /* private mode */
  }
  return COINS_INITIAL_BALANCE;
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === COINS_STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('word-builder-coins', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('word-builder-coins', onStoreChange);
  };
}

function writeCoins(next: number): void {
  try {
    localStorage.setItem(COINS_STORAGE_KEY, String(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('word-builder-coins'));
}

/**
 * Local coin balance for Word Builder hints — same starting balance and costs
 * as the Flutter app, persisted in this browser only.
 */
export function useWordBuilderCoins() {
  const coins = useSyncExternalStore(subscribe, readCoins, () => COINS_INITIAL_BALANCE);

  const addCoins = useCallback((amount: number) => {
    writeCoins(Math.max(0, readCoins() + amount));
  }, []);

  const trySpend = useCallback((amount: number): boolean => {
    const prev = readCoins();
    if (prev < amount) return false;
    writeCoins(prev - amount);
    return true;
  }, []);

  return { coins, ready: true, addCoins, trySpend };
}
