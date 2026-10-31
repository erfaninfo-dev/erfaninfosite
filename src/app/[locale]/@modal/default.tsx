/**
 * The modal slot renders nothing unless a route is intercepted into it.
 *
 * `default.tsx` is what Next shows for a parallel slot that has no match —
 * without it, a hard navigation to any other page would 404 the whole route.
 */
export default function ModalDefault() {
  return null;
}
