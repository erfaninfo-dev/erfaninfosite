/**
 * English speech for a word, an example, or a sample.
 *
 * One utterance at a time. Speaking the same text again stops it.
 */

const SPEAK_RATES = [0.8, 1, 1.15] as const;

let current = '';
let rate: (typeof SPEAK_RATES)[number] = 1;
const listeners = new Set<() => void>();
const rateListeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function notifyRate() {
  for (const listener of rateListeners) listener();
}

export function speakingText(): string {
  return current;
}

export function getServerSpeakingText(): string {
  return '';
}

export function getSpeakRate(): number {
  return rate;
}

export function getServerSpeakRate(): number {
  return 1;
}

export function subscribeSpeakRate(listener: () => void): () => void {
  rateListeners.add(listener);
  return () => rateListeners.delete(listener);
}

export function cycleSpeakRate(): number {
  const index = SPEAK_RATES.indexOf(rate);
  rate = SPEAK_RATES[(index + 1) % SPEAK_RATES.length] ?? 1;
  notifyRate();
  return rate;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (!current) return;
  current = '';
  notify();
}

export function subscribeSpeaking(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleSpeak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const spoken = text.trim();
  if (!spoken) return;

  window.speechSynthesis.cancel();
  if (current === spoken) {
    current = '';
    notify();
    return;
  }

  current = spoken;
  notify();
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  const stop = () => {
    if (current !== spoken) return;
    current = '';
    notify();
  };
  utterance.onend = stop;
  utterance.onerror = stop;
  window.speechSynthesis.speak(utterance);
}
