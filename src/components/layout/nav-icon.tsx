import {
  IconBook,
  IconGrammar,
  IconHome,
  IconPerson,
  IconPlay,
  IconSettings,
  IconSpeaking,
} from '@/components/ui/icons';
import type { NavItem } from '@/lib/nav';

const ICONS = {
  home: IconHome,
  book: IconBook,
  grammar: IconGrammar,
  speaking: IconSpeaking,
  play: IconPlay,
  you: IconPerson,
  settings: IconSettings,
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
