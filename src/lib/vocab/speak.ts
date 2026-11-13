/**
 * English speech for a word, an example, or a sample.
 *
 * One utterance at a time. Speaking the same text again stops it.
 */

let current = '';
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function speakingText(): string {
  return current;
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
  const stop = () => {
    if (current !== spoken) return;
    current = '';
    notify();
  };
  utterance.onend = stop;
  utterance.onerror = stop;
  window.speechSynthesis.speak(utterance);
}
