'use client';

import { useEffect, useRef, useState } from 'react';

const SPEEDS = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0] as const;

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Exact web mirror of Flutter's `CambridgeAudioBar` (`cambridge_audio_bar.dart`):
 * back 5s, forward 5s, play/pause, position, 3px teal seek track with 12px white thumb,
 * duration, speed menu (0.4x–2.0x), and download button.
 */
export function CambridgeAudioBar({ url }: { url: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const enabled = Boolean(url && url.trim().length > 0 && !failed);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }, [url]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el || !enabled) return;
    if (el.paused) {
      el.playbackRate = speed;
      void el.play().catch(() => setFailed(true));
    } else {
      el.pause();
    }
  }

  function skip(deltaSec: number) {
    const el = audioRef.current;
    if (!el || !enabled) return;
    const next = Math.max(0, Math.min(duration || Infinity, el.currentTime + deltaSec));
    el.currentTime = next;
    setPosition(next);
  }

  function seekToClientX(clientX: number, rect: DOMRect) {
    const el = audioRef.current;
    if (!el || !enabled || duration <= 0 || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = ratio * duration;
    el.currentTime = target;
    setPosition(target);
  }

  function chooseSpeed(next: number) {
    setSpeed(next);
    setSpeedOpen(false);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  const pct = duration > 0 ? Math.max(0, Math.min(100, (position / duration) * 100)) : 0;

  return (
    <div
      dir="ltr"
      className="mx-[2px] flex h-[44px] shrink-0 items-center gap-2 bg-[#ECEDEE] px-4 sm:px-8"
    >
      {url ? (
        <audio
          key={url}
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration || 0);
            setFailed(false);
          }}
          onError={() => setFailed(true)}
        />
      ) : null}

      {/* Rewind 5s */}
      <button
        type="button"
        disabled={!enabled}
        onClick={() => skip(-5)}
        title="Back 5s"
        className="grid size-6 shrink-0 cursor-pointer place-items-center text-[#066A6E] transition-transform hover:scale-105 disabled:cursor-default disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      {/* Forward 5s */}
      <button
        type="button"
        disabled={!enabled}
        onClick={() => skip(5)}
        title="Forward 5s"
        className="grid size-6 shrink-0 cursor-pointer place-items-center text-[#066A6E] transition-transform hover:scale-105 disabled:cursor-default disabled:opacity-40"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5 -scale-x-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        disabled={!enabled}
        onClick={togglePlay}
        title={playing ? 'Pause' : 'Play'}
        className="grid size-6 shrink-0 cursor-pointer place-items-center text-[#066A6E] transition-transform hover:scale-105 disabled:cursor-default disabled:opacity-40"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
        )}
      </button>

      {/* Position */}
      <span className="px-1 text-[14px] leading-5 font-semibold text-[#066A6E] tabular-nums">
        {fmtTime(position)}
      </span>

      {/* 3px Teal-Outlined Seek Track with 12px White Thumb */}
      <div
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        tabIndex={enabled ? 0 : -1}
        onClick={(e) => seekToClientX(e.clientX, e.currentTarget.getBoundingClientRect())}
        className="relative flex h-6 flex-1 cursor-pointer items-center"
      >
        <div className="relative h-[5px] w-full overflow-hidden rounded-full border border-[#286C6F] bg-white">
          <div className="h-full bg-[#286C6F]" style={{ width: `${pct}%` }} />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#286C6F] bg-white shadow-xs"
          style={{ left: `${pct}%` }}
        />
      </div>

      {/* Duration */}
      <span className="px-1 text-[14px] leading-5 font-semibold text-[#066A6E] tabular-nums">
        {fmtTime(duration)}
      </span>

      {/* Bordered Pill Speed Selector (`1x ∨`, matching Testino) */}
      <div className="relative">
        <button
          type="button"
          disabled={!enabled}
          onClick={() => setSpeedOpen((o) => !o)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#066A6E] bg-white px-2.5 py-0.5 text-[13px] font-semibold text-[#066A6E] hover:bg-[#066A6E]/10 disabled:cursor-default disabled:opacity-40"
        >
          <span>{Number.isInteger(speed) ? `${speed}x` : `${speed.toFixed(1)}x`}</span>
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 8 4 4 4-4" />
          </svg>
        </button>
        {speedOpen ? (
          <div className="absolute right-0 top-8 z-50 w-20 rounded-md border border-[#E5E7EB] bg-white py-1 shadow-lg">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => chooseSpeed(s)}
                className="flex w-full cursor-pointer items-center justify-between px-2.5 py-1 text-xs font-semibold text-[#202327] hover:bg-[#F1F2EB]"
              >
                <span>{s.toFixed(1)}x</span>
                {speed === s ? <span className="text-[#066A6E]">✓</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Download */}
      {enabled && url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Download audio"
          className="grid size-6 shrink-0 place-items-center text-[#066A6E] transition-transform hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
          </svg>
        </a>
      ) : (
        <span className="grid size-6 shrink-0 place-items-center text-[#066A6E] opacity-40">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
          </svg>
        </span>
      )}
    </div>
  );
}
