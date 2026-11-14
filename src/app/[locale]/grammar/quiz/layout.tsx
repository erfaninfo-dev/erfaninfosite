import { GrammarQuizFocus } from '@/components/features/grammar/quiz-focus';

export default function GrammarQuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GrammarQuizFocus />
      {children}
    </>
  );
}