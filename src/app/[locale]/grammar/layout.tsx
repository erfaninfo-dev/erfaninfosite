/**
 * Grammar stays left-to-right in every locale.
 *
 * Topic names, list numbers, and quiz English are LTR content. The app wraps
 * this section in LTR so cards stay number-then-name from the left even when
 * the rest of the site (header, nav) is RTL for Persian or Kurdish — the same
 * pattern Speaking uses. Nested `dir="rtl"` on gloss/explanation text is
 * unaffected.
 */
export default function GrammarLayout({ children }: { children: React.ReactNode }) {
  return <div dir="ltr">{children}</div>;
}
