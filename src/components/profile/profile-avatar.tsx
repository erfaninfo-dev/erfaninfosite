'use client';

import { useState } from 'react';

import { cn } from '@/lib/cn';

export type AvatarPreset = {
  id: string;
  group: 'boy' | 'girl' | 'game';
  bg: string;
  bgGradient: string;
  fg: string;
  symbol: string;
  label: string;
};

/**
 * 8 account presets (`m1..m4`, `f1..f4`) matching `update_profile.php`, plus
 * 12 playful game character avatars (`g1..g12`) for 1v1 Word Duels.
 */
export const PROFILE_PRESETS: ReadonlyArray<AvatarPreset> = [
  {
    id: 'm1',
    group: 'boy',
    bg: '#2563EB',
    bgGradient: 'linear-gradient(135deg, #38BDF8, #2563EB)',
    fg: '#ffffff',
    symbol: '◆',
    label: 'Boy 1',
  },
  {
    id: 'm2',
    group: 'boy',
    bg: '#4F46E5',
    bgGradient: 'linear-gradient(135deg, #818CF8, #4F46E5)',
    fg: '#ffffff',
    symbol: '◆',
    label: 'Boy 2',
  },
  {
    id: 'm3',
    group: 'boy',
    bg: '#0D9488',
    bgGradient: 'linear-gradient(135deg, #2DD4BF, #0D9488)',
    fg: '#ffffff',
    symbol: '◆',
    label: 'Boy 3',
  },
  {
    id: 'm4',
    group: 'boy',
    bg: '#0891B2',
    bgGradient: 'linear-gradient(135deg, #22D3EE, #0284C7)',
    fg: '#ffffff',
    symbol: '◆',
    label: 'Boy 4',
  },
  {
    id: 'f1',
    group: 'girl',
    bg: '#DB2777',
    bgGradient: 'linear-gradient(135deg, #F472B6, #DB2777)',
    fg: '#ffffff',
    symbol: '★',
    label: 'Girl 1',
  },
  {
    id: 'f2',
    group: 'girl',
    bg: '#E11D48',
    bgGradient: 'linear-gradient(135deg, #FB7185, #E11D48)',
    fg: '#ffffff',
    symbol: '★',
    label: 'Girl 2',
  },
  {
    id: 'f3',
    group: 'girl',
    bg: '#9333EA',
    bgGradient: 'linear-gradient(135deg, #C084FC, #9333EA)',
    fg: '#ffffff',
    symbol: '★',
    label: 'Girl 3',
  },
  {
    id: 'f4',
    group: 'girl',
    bg: '#C026D3',
    bgGradient: 'linear-gradient(135deg, #E879F9, #C026D3)',
    fg: '#ffffff',
    symbol: '★',
    label: 'Girl 4',
  },
];

export const DUEL_EXTRA_AVATARS: ReadonlyArray<AvatarPreset> = [
  {
    id: 'g1',
    group: 'game',
    bg: '#EA580C',
    bgGradient: 'linear-gradient(135deg, #FDBA74, #EA580C)',
    fg: '#ffffff',
    symbol: '🦊',
    label: 'Fox',
  },
  {
    id: 'g2',
    group: 'game',
    bg: '#D97706',
    bgGradient: 'linear-gradient(135deg, #FDE047, #D97706)',
    fg: '#ffffff',
    symbol: '🐱',
    label: 'Cat',
  },
  {
    id: 'g3',
    group: 'game',
    bg: '#059669',
    bgGradient: 'linear-gradient(135deg, #6EE7B7, #059669)',
    fg: '#ffffff',
    symbol: '🦉',
    label: 'Owl',
  },
  {
    id: 'g4',
    group: 'game',
    bg: '#0284C7',
    bgGradient: 'linear-gradient(135deg, #A7F3D0, #0EA5E9)',
    fg: '#ffffff',
    symbol: '🐼',
    label: 'Panda',
  },
  {
    id: 'g5',
    group: 'game',
    bg: '#CA8A04',
    bgGradient: 'linear-gradient(135deg, #FEF08A, #D97706)',
    fg: '#ffffff',
    symbol: '🦁',
    label: 'Lion',
  },
  {
    id: 'g6',
    group: 'game',
    bg: '#2563EB',
    bgGradient: 'linear-gradient(135deg, #67E8F9, #2563EB)',
    fg: '#ffffff',
    symbol: '🤖',
    label: 'Robot',
  },
  {
    id: 'g7',
    group: 'game',
    bg: '#312E81',
    bgGradient: 'linear-gradient(135deg, #818CF8, #1E1B4B)',
    fg: '#ffffff',
    symbol: '🚀',
    label: 'Astronaut',
  },
  {
    id: 'g8',
    group: 'game',
    bg: '#6D28D9',
    bgGradient: 'linear-gradient(135deg, #C084FC, #4C1D95)',
    fg: '#ffffff',
    symbol: '🧙',
    label: 'Wizard',
  },
  {
    id: 'g9',
    group: 'game',
    bg: '#1E293B',
    bgGradient: 'linear-gradient(135deg, #64748B, #0F172A)',
    fg: '#ffffff',
    symbol: '🥷',
    label: 'Ninja',
  },
  {
    id: 'g10',
    group: 'game',
    bg: '#EC4899',
    bgGradient: 'linear-gradient(135deg, #FBCFE8, #EC4899)',
    fg: '#ffffff',
    symbol: '🐰',
    label: 'Bunny',
  },
  {
    id: 'g11',
    group: 'game',
    bg: '#B45309',
    bgGradient: 'linear-gradient(135deg, #FCD34D, #B45309)',
    fg: '#ffffff',
    symbol: '🐻',
    label: 'Bear',
  },
  {
    id: 'g12',
    group: 'game',
    bg: '#7C3AED',
    bgGradient: 'linear-gradient(135deg, #FBBF24, #7C3AED)',
    fg: '#ffffff',
    symbol: '👑',
    label: 'Champion',
  },
];

export const ALL_AVATAR_PRESETS: ReadonlyArray<AvatarPreset> = [
  ...PROFILE_PRESETS,
  ...DUEL_EXTRA_AVATARS,
];

const PRESETS_BY_ID: Record<string, AvatarPreset> = Object.fromEntries(
  ALL_AVATAR_PRESETS.map((p) => [p.id, p])
);

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'https://erfaninfo.com/wordsapi';

function AvatarArtwork({ id }: { id: string }) {
  switch (id) {
    /* ── Boys ── */
    case 'm1':
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <path d="M12 64c2-13 10-18 20-18s18 5 20 18" fill="#1E40AF" />
          <path d="M25 46l7 7 7-7" fill="#93C5FD" />
          <circle cx="32" cy="30" r="15" fill="#FCD5B5" />
          <path d="M16 28c0-10 7-17 17-17 9 0 15 5 16 14-4-4-9-6-16-5-7 1-12 3-17 8Z" fill="#5C3A21" />
          <circle cx="26.5" cy="31" r="2.2" fill="#2D1B10" />
          <circle cx="37.5" cy="31" r="2.2" fill="#2D1B10" />
          <circle cx="22" cy="35" r="2.4" fill="#F4A29E" opacity="0.55" />
          <circle cx="42" cy="35" r="2.4" fill="#F4A29E" opacity="0.55" />
          <path d="M27.5 37.5c2 2.4 7 2.4 9 0" fill="none" stroke="#8C4A32" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'm2':
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <path d="M12 64c2-13 10-18 20-18s18 5 20 18" fill="#312E81" />
          <circle cx="32" cy="30" r="15" fill="#F5CBA7" />
          <path d="M16 26c1-10 8-15 16-15s15 5 16 15c-5-5-10-7-16-7s-11 2-16 7Z" fill="#1F2937" />
          <rect x="20.5" y="27" width="10" height="7" rx="3" fill="rgba(255,255,255,0.28)" stroke="#1E1B4B" strokeWidth="2" />
          <rect x="33.5" y="27" width="10" height="7" rx="3" fill="rgba(255,255,255,0.28)" stroke="#1E1B4B" strokeWidth="2" />
          <line x1="30.5" y1="30.5" x2="33.5" y2="30.5" stroke="#1E1B4B" strokeWidth="2" />
          <circle cx="25.5" cy="30.5" r="1.8" fill="#1F2937" />
          <circle cx="38.5" cy="30.5" r="1.8" fill="#1F2937" />
          <path d="M28 38.5c2 2 6 2 8 0" fill="none" stroke="#7C432B" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'm3':
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <path d="M12 64c2-13 10-18 20-18s18 5 20 18" fill="#115E59" />
          <circle cx="32" cy="31" r="14.5" fill="#F6C8A0" />
          <path d="M16 25c1-9 7-14 16-14s15 5 16 14H16Z" fill="#F59E0B" />
          <path d="M14 24h36c0 3-2 4-5 4H19c-3 0-5-1-5-4Z" fill="#D97706" />
          <circle cx="26.5" cy="32" r="2.2" fill="#2D1B10" />
          <circle cx="37.5" cy="32" r="2.2" fill="#2D1B10" />
          <path d="M27.5 38.5c2.2 2.4 6.8 2.4 9 0" fill="none" stroke="#7C432B" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'm4':
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <path d="M12 64c2-13 10-18 20-18s18 5 20 18" fill="#075985" />
          <path d="M15 30a17 17 0 0 1 34 0" fill="none" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
          <rect x="12" y="27" width="6" height="11" rx="3" fill="#F59E0B" />
          <rect x="46" y="27" width="6" height="11" rx="3" fill="#F59E0B" />
          <circle cx="32" cy="31" r="14.5" fill="#FCD5B5" />
          <path d="M18 27c1-8 6-13 14-13s13 5 14 13c-4-4-9-5-14-5s-10 1-14 5Z" fill="#3E2723" />
          <circle cx="26.5" cy="32" r="2.1" fill="#2D1B10" />
          <circle cx="37.5" cy="32" r="2.1" fill="#2D1B10" />
          <path d="M28 38.5c2 2.2 6 2.2 8 0" fill="none" stroke="#8C4A32" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    /* ── Girls ── */
    case 'f1':
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <path d="M13 31c0-13 8-20 19-20s19 7 19 20v16H13V31Z" fill="#4A2511" />
          <path d="M13 64c2-12 9-17 19-17s17 5 19 17" fill="#BE185D" />
          <circle cx="32" cy="31" r="14.5" fill="#FDE0C8" />
          <path d="M17 28c2-8 8-12 15-12s13 4 15 12c-5-3-10-4-15-4s-10 1-15 4Z" fill="#4A2511" />
          <circle cx="43" cy="22" r="3" fill="#FDE047" />
          <circle cx="26.5" cy="32" r="2.1" fill="#2D1B10" />
          <circle cx="37.5" cy="32" r="2.1" fill="#2D1B10" />
          <circle cx="22" cy="36" r="2.5" fill="#FB7185" opacity="0.5" />
          <circle cx="42" cy="36" r="2.5" fill="#FB7185" opacity="0.5" />
          <path d="M27.5 38.5c2.2 2.4 6.8 2.4 9 0" fill="none" stroke="#9D3B46" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case 'f2':
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="47" cy="20" r="8" fill="#5B2C18" />
          <path d="M14 64c2-12 8-17 18-17s16 5 18 17" fill="#9F1239" />
          <circle cx="32" cy="31" r="14.5" fill="#FCD5B5" />
          <path d="M17 29c1-10 7-16 15-16s14 6 15 16c-5-5-10-7-15-7s-10 2-15 7Z" fill="#5B2C18" />
          <circle cx="26" cy="32" r="5" fill="rgba(255,255,255,0.28)" stroke="#881337" strokeWidth="1.9" />
          <circle cx="38" cy="32" r="5" fill="rgba(255,255,255,0.28)" stroke="#881337" strokeWidth="1.9" />
          <line x1="31" y1="32" x2="33" y2="32" stroke="#881337" strokeWidth="1.9" />
          <circle cx="26" cy="32" r="1.8" fill="#2D1B10" />
          <circle cx="38" cy="32" r="1.8" fill="#2D1B10" />
          <path d="M28 39c2 2 6 2 8 0" fill="none" stroke="#9D3B46" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case 'f3':
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <path d="M12 34c0-14 8-22 20-22s20 8 20 22v14H12V34Z" fill="#3B1D5A" />
          <path d="M14 64c2-12 8-17 18-17s16 5 18 17" fill="#6B21A8" />
          <circle cx="32" cy="31" r="14.5" fill="#FDE0C8" />
          <path d="M17 26a15 15 0 0 1 30 0" fill="none" stroke="#F472B6" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="26.5" cy="32" r="2.1" fill="#2D1B10" />
          <circle cx="37.5" cy="32" r="2.1" fill="#2D1B10" />
          <circle cx="22" cy="36" r="2.5" fill="#F472B6" opacity="0.5" />
          <circle cx="42" cy="36" r="2.5" fill="#F472B6" opacity="0.5" />
          <path d="M27.5 38.5c2.2 2.4 6.8 2.4 9 0" fill="none" stroke="#9D3B46" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case 'f4':
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="17" cy="18" r="8" fill="#2E1065" />
          <circle cx="47" cy="18" r="8" fill="#2E1065" />
          <path d="M14 64c2-12 8-17 18-17s16 5 18 17" fill="#86198F" />
          <circle cx="32" cy="32" r="14.5" fill="#FCD5B5" />
          <path d="M17 29c1-9 7-14 15-14s14 5 15 14c-5-4-10-5-15-5s-10 1-15 5Z" fill="#2E1065" />
          <circle cx="26.5" cy="33" r="2.1" fill="#2D1B10" />
          <circle cx="37.5" cy="33" r="2.1" fill="#2D1B10" />
          <circle cx="22" cy="37" r="2.4" fill="#F472B6" opacity="0.55" />
          <circle cx="42" cy="37" r="2.4" fill="#F472B6" opacity="0.55" />
          <path d="M27.5 39.5c2.2 2.2 6.8 2.2 9 0" fill="none" stroke="#9D3B46" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );

    /* ── Playful Game Characters (g1..g12) ── */
    case 'g1': // Fox
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <polygon points="15,14 27,24 14,32" fill="#C2410C" />
          <polygon points="49,14 37,24 50,32" fill="#C2410C" />
          <polygon points="17,18 24,24 17,28" fill="#FFF7ED" />
          <polygon points="47,18 40,24 47,28" fill="#FFF7ED" />
          <ellipse cx="32" cy="36" rx="18" ry="15" fill="#F97316" />
          <path d="M14 37c4 9 11 14 18 14s14-5 18-14c-6 2-11 0-18-5-7 5-12 7-18 5Z" fill="#FFF7ED" />
          <circle cx="25" cy="34" r="2.4" fill="#1C1917" />
          <circle cx="39" cy="34" r="2.4" fill="#1C1917" />
          <ellipse cx="32" cy="40.5" rx="3.2" ry="2.3" fill="#1C1917" />
          <path d="M28.5 44.5c1.8 1.6 5.2 1.6 7 0" fill="none" stroke="#7C2D12" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'g2': // Cat
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <polygon points="16,13 28,23 16,32" fill="#FFFBEB" />
          <polygon points="48,13 36,23 48,32" fill="#FFFBEB" />
          <polygon points="19,18 25,23 19,28" fill="#FDA4AF" />
          <polygon points="45,18 39,23 45,28" fill="#FDA4AF" />
          <ellipse cx="32" cy="36" rx="18" ry="15" fill="#FFFBEB" />
          <path d="M29 22v5M32 21v6M35 22v5" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="25" cy="34" r="2.4" fill="#1F2937" />
          <circle cx="39" cy="34" r="2.4" fill="#1F2937" />
          <polygon points="29.5,38.5 34.5,38.5 32,41.5" fill="#FB7185" />
          <path d="M27.5 43c2 1.8 4.5.5 4.5-1.2 0 1.7 2.5 3 4.5 1.2" fill="none" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'g3': // Owl
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <ellipse cx="32" cy="36" rx="18" ry="19" fill="#92400E" />
          <polygon points="17,17 25,22 18,26" fill="#78350F" />
          <polygon points="47,17 39,22 46,26" fill="#78350F" />
          <ellipse cx="32" cy="44" rx="11" ry="9" fill="#FEF3C7" />
          <circle cx="25" cy="31" r="7.5" fill="#FFFBEB" />
          <circle cx="39" cy="31" r="7.5" fill="#FFFBEB" />
          <circle cx="25.5" cy="31" r="3.4" fill="#1C1917" />
          <circle cx="38.5" cy="31" r="3.4" fill="#1C1917" />
          <circle cx="26.5" cy="29.8" r="1.2" fill="#ffffff" />
          <circle cx="39.5" cy="29.8" r="1.2" fill="#ffffff" />
          <polygon points="29,36 35,36 32,41.5" fill="#F59E0B" />
        </svg>
      );
    case 'g4': // Panda
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="17" cy="20" r="7" fill="#1E293B" />
          <circle cx="47" cy="20" r="7" fill="#1E293B" />
          <ellipse cx="32" cy="36" rx="18.5" ry="16" fill="#FFFFFF" />
          <ellipse cx="24" cy="34" rx="5.5" ry="6.5" transform="rotate(-15 24 34)" fill="#1E293B" />
          <ellipse cx="40" cy="34" rx="5.5" ry="6.5" transform="rotate(15 40 34)" fill="#1E293B" />
          <circle cx="25" cy="33" r="1.8" fill="#FFFFFF" />
          <circle cx="39" cy="33" r="1.8" fill="#FFFFFF" />
          <ellipse cx="32" cy="40" rx="3.2" ry="2.2" fill="#1E293B" />
          <path d="M28.5 44c1.8 1.6 5.2 1.6 7 0" fill="none" stroke="#1E293B" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'g5': // Lion
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="32" cy="34" r="21" fill="#B45309" />
          <circle cx="19" cy="21" r="5.5" fill="#FBBF24" />
          <circle cx="45" cy="21" r="5.5" fill="#FBBF24" />
          <circle cx="32" cy="35" r="14.5" fill="#FDE68A" />
          <circle cx="26" cy="33" r="2.3" fill="#292524" />
          <circle cx="38" cy="33" r="2.3" fill="#292524" />
          <polygon points="29,37.5 35,37.5 32,41" fill="#92400E" />
          <path d="M27.5 43c2.2 1.8 6.8 1.8 9 0" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'g6': // Robot
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <line x1="32" y1="11" x2="32" y2="19" stroke="#E0F2FE" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="10" r="3.5" fill="#FDE047" />
          <rect x="14" y="19" width="36" height="30" rx="9" fill="#E0F2FE" />
          <rect x="19" y="25" width="26" height="14" rx="5" fill="#0F172A" />
          <circle cx="26" cy="32" r="3.2" fill="#38BDF8" />
          <circle cx="38" cy="32" r="3.2" fill="#38BDF8" />
          <rect x="24" y="42.5" width="16" height="3" rx="1.5" fill="#64748B" />
        </svg>
      );
    case 'g7': // Astronaut
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="16" cy="16" r="1.5" fill="#FDE047" />
          <circle cx="50" cy="18" r="1.8" fill="#FDE047" />
          <circle cx="48" cy="48" r="1.4" fill="#FFFFFF" />
          <path d="M13 64c2-11 9-16 19-16s17 5 19 16" fill="#E2E8F0" />
          <circle cx="32" cy="31" r="17" fill="#F8FAFC" />
          <rect x="20" y="22" width="24" height="17" rx="8.5" fill="#1E3A8A" />
          <path d="M24 27c2-2 5-3 9-2" fill="none" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'g8': // Wizard
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="32" cy="39" r="13.5" fill="#FCD5B5" />
          <path d="M18 42c2 10 8 15 14 15s12-5 14-15c-4 3-9 4-14 4s-10-1-14-4Z" fill="#F8FAFC" />
          <circle cx="27" cy="38" r="2.1" fill="#1E1B4B" />
          <circle cx="37" cy="38" r="2.1" fill="#1E1B4B" />
          <polygon points="32,7 16,30 48,30" fill="#4C1D95" />
          <ellipse cx="32" cy="30" rx="22" ry="4.5" fill="#6D28D9" />
          <polygon points="32,16 33.6,20.2 38,20.5 34.5,23.2 35.6,27.5 32,25 28.4,27.5 29.5,23.2 26,20.5 30.4,20.2" fill="#FDE047" />
        </svg>
      );
    case 'g9': // Ninja
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <path d="M12 64c2-12 10-17 20-17s18 5 20 17" fill="#0F172A" />
          <circle cx="32" cy="32" r="16" fill="#1E293B" />
          <rect x="16" y="22" width="32" height="5" rx="2.5" fill="#EF4444" />
          <rect x="20" y="28" width="24" height="9" rx="4.5" fill="#FCD5B5" />
          <circle cx="26.5" cy="32.5" r="2.2" fill="#0F172A" />
          <circle cx="37.5" cy="32.5" r="2.2" fill="#0F172A" />
        </svg>
      );
    case 'g10': // Bunny
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <ellipse cx="23" cy="18" rx="5.5" ry="13" fill="#FFF1F2" />
          <ellipse cx="41" cy="18" rx="5.5" ry="13" fill="#FFF1F2" />
          <ellipse cx="23" cy="19" rx="2.8" ry="8.5" fill="#FDA4AF" />
          <ellipse cx="41" cy="19" rx="2.8" ry="8.5" fill="#FDA4AF" />
          <ellipse cx="32" cy="39" rx="17" ry="14.5" fill="#FFF1F2" />
          <circle cx="25.5" cy="37" r="2.3" fill="#1F2937" />
          <circle cx="38.5" cy="37" r="2.3" fill="#1F2937" />
          <ellipse cx="32" cy="41.5" rx="2.5" ry="1.8" fill="#FB7185" />
          <path d="M28.5 45c1.8 1.6 5.2 1.6 7 0" fill="none" stroke="#BE185D" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'g11': // Bear
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="17" cy="21" r="7" fill="#92400E" />
          <circle cx="47" cy="21" r="7" fill="#92400E" />
          <circle cx="17" cy="21" r="3.6" fill="#FDE68A" />
          <circle cx="47" cy="21" r="3.6" fill="#FDE68A" />
          <ellipse cx="32" cy="36" rx="18" ry="16" fill="#B45309" />
          <ellipse cx="32" cy="41" rx="9" ry="7" fill="#FEF3C7" />
          <circle cx="25" cy="33" r="2.4" fill="#1C1917" />
          <circle cx="39" cy="33" r="2.4" fill="#1C1917" />
          <ellipse cx="32" cy="38.5" rx="3.4" ry="2.4" fill="#451A03" />
          <path d="M28.5 43c1.8 1.6 5.2 1.6 7 0" fill="none" stroke="#451A03" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'g12': // Champion Crown
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <path d="M14 45L10 22l12 9 10-15 10 15 12-9-4 23H14Z" fill="#FDE047" stroke="#FFFBEB" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="14" y="45" width="36" height="7" rx="3.5" fill="#F59E0B" />
          <circle cx="32" cy="33" r="3.2" fill="#EC4899" />
          <circle cx="21" cy="36" r="2.4" fill="#38BDF8" />
          <circle cx="43" cy="36" r="2.4" fill="#38BDF8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="32" cy="32" r="14" fill="rgba(255,255,255,0.28)" />
        </svg>
      );
  }
}

export function ProfileAvatar({
  avatarId,
  userId,
  size = 48,
  showBorder = false,
  cacheBust,
  className,
}: {
  avatarId: string;
  userId?: number | null;
  size?: number;
  showBorder?: boolean;
  cacheBust?: number;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const key = avatarId.trim() || 'm1';
  const preset = PRESETS_BY_ID[key] ?? PROFILE_PRESETS[0]!;
  const isPhoto =
    (key === 'photo' || key === 'custom') &&
    typeof userId === 'number' &&
    userId > 0 &&
    !imgFailed;

  if (isPhoto) {
    const qs = cacheBust ? `&v=${cacheBust}` : '';
    const src = `${API_BASE}/profile_photo.php?user_id=${userId}${qs}`;
    return (
      <span
        className={cn(
          'inline-block shrink-0 overflow-hidden rounded-full bg-surface-2',
          showBorder && 'ring-2 ring-white/80 shadow-xs',
          className
        )}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full',
        showBorder && 'ring-2 ring-white/80 shadow-xs',
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: preset.bg,
        backgroundImage: preset.bgGradient,
        color: preset.fg,
      }}
      aria-hidden
    >
      <AvatarArtwork id={preset.id} />
    </span>
  );
}
