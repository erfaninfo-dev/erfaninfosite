import {
  IconBook,
  IconGrammar,
  IconHome,
  IconPlay,
  IconSpeaking,
} from '@/components/ui/icons';
import type { NavItem } from '@/lib/nav';

const ICONS = {
  home: IconHome,
  book: IconBook,
  grammar: IconGrammar,
  speaking: IconSpeaking,
  play: IconPlay,
} as const;

export function NavIcon({
  name,
  className,
}: {
  name: NavItem['icon'];
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
