'use client';

/**
 * Word Builder audio controller — plays the app's exact SFX & BGM assets from
 * `/audio/word-builder/` with persistent toggles in localStorage.
 * No water/train/prison audio (classic clean tray only).
 */

export type WordBuilderSfx = 'letterPop' | 'correct' | 'wrong' | 'levelComplete';

const SFX_PATHS: Record<WordBuilderSfx, string> = {
  letterPop: '/audio/word-builder/letters_pop.mp3',
  correct: '/audio/word-builder/word_success.mp3',
  wrong: '/audio/word-builder/word_error.mp3',
  levelComplete: '/audio/word-builder/level_success.mp3',
};

const SFX_VOLUMES: Record<WordBuilderSfx, number> = {
  letterPop: 0.72,
  correct: 0.72,
  wrong: 0.65,
  levelComplete: 0.85,
};

const BGM_PATH = '/audio/word-builder/words_game_bgmusic.mp3';
const BGM_VOLUME = 0.24;

const KEY_BGM = 'wb_bgm_enabled_v1';
const KEY_SFX = 'wb_sfx_enabled_v1';

export type AudioPrefs = {
  bgm: boolean;
  sfx: boolean;
};

const DEFAULT_PREFS: AudioPrefs = { bgm: true, sfx: true };
const listeners = new Set<() => void>();
let cachedPrefs: AudioPrefs = DEFAULT_PREFS;
let loadedFromStorage = false;

function readPrefsFromStorage(): AudioPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  if (loadedFromStorage) return cachedPrefs;
  loadedFromStorage = true;
  try {
    const rawBgm = window.localStorage.getItem(KEY_BGM);
    const rawSfx = window.localStorage.getItem(KEY_SFX);
    cachedPrefs = {
      bgm: rawBgm === null ? true : rawBgm === '1',
      sfx: rawSfx === null ? true : rawSfx === '1',
    };
  } catch {
    cachedPrefs = DEFAULT_PREFS;
  }
  return cachedPrefs;
}

export function getAudioPrefsSnapshot(): AudioPrefs {
  return readPrefsFromStorage();
}

export function getServerAudioPrefsSnapshot(): AudioPrefs {
  return DEFAULT_PREFS;
}

export function subscribeAudioPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyPrefs() {
  for (const fn of listeners) fn();
}

let bgmAudio: HTMLAudioElement | null = null;
let bgmSessionActive = false;

function ensureBgmAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!bgmAudio) {
    bgmAudio = new Audio(BGM_PATH);
    bgmAudio.loop = true;
    bgmAudio.volume = BGM_VOLUME;
    bgmAudio.preload = 'none';
  }
  return bgmAudio;
}

export function setBgmEnabled(enabled: boolean): void {
  const cur = readPrefsFromStorage();
  cachedPrefs = { ...cur, bgm: enabled };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY_BGM, enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }
  if (enabled && bgmSessionActive) {
    const audio = ensureBgmAudio();
    if (audio) void audio.play().catch(() => {});
  } else if (!enabled && bgmAudio) {
    bgmAudio.pause();
  }
  notifyPrefs();
}

export function setSfxEnabled(enabled: boolean): void {
  const cur = readPrefsFromStorage();
  cachedPrefs = { ...cur, sfx: enabled };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY_SFX, enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }
  notifyPrefs();
}

/** Called when entering a Word Builder session. Starts BGM if unlocked & enabled. */
export function startSessionBgm(): void {
  bgmSessionActive = true;
  const prefs = readPrefsFromStorage();
  if (!prefs.bgm) return;
  const audio = ensureBgmAudio();
  if (audio && audio.paused) {
    void audio.play().catch(() => {
      /* browser autoplay block until first pointer/key gesture */
    });
  }
}

/** Call on first user interaction inside the session to unlock BGM if autoplay was blocked. */
export function unlockSessionBgmOnGesture(): void {
  if (!bgmSessionActive) return;
  const prefs = readPrefsFromStorage();
  if (!prefs.bgm) return;
  const audio = ensureBgmAudio();
  if (audio && audio.paused) {
    void audio.play().catch(() => {});
  }
}

export function stopSessionBgm(): void {
  bgmSessionActive = false;
  if (bgmAudio) {
    bgmAudio.pause();
    try {
      bgmAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

export function pauseSessionBgm(): void {
  if (bgmAudio && !bgmAudio.paused) {
    bgmAudio.pause();
  }
}

/** Plays a sound effect cleanly (overlapping rapid letter pops smoothly). */
export function playWordBuilderSfx(sound: WordBuilderSfx): void {
  if (typeof window === 'undefined') return;
  const prefs = readPrefsFromStorage();
  if (!prefs.sfx) return;
  try {
    const el = new Audio(SFX_PATHS[sound]);
    el.volume = SFX_VOLUMES[sound];
    void el.play().catch(() => {});
  } catch {
    /* ignore */
  }
}
