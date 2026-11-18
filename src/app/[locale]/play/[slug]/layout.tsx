import { WordBuilderSessionFocus } from '@/components/features/games/word-builder-session-focus';

export default function PlaySessionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WordBuilderSessionFocus />
      {children}
    </>
  );
}
