export function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-on-surface-variant mb-2 px-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
      {children}
    </p>
  );
}
