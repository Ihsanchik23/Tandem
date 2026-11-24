import { t } from "@/lib/i18n";
import { HomeIcon, MessagesIcon, ProfileIcon, SearchIcon, WorkIcon } from "./icons";

// myUsername — имя вошедшего: «Профиль» выделяется только на своём профиле.
type Match = (path: string, myUsername: string | null) => boolean;

export const NAV_ITEMS: readonly { href: string; label: string; Icon: typeof HomeIcon; match: Match }[] = [
  { href: "/", label: t.nav.home, Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/search", label: t.nav.search, Icon: SearchIcon, match: (p: string) => p.startsWith("/search") },
  { href: "/work", label: t.nav.work, Icon: WorkIcon, match: (p: string) => p.startsWith("/work") },
  { href: "/messages", label: t.nav.messages, Icon: MessagesIcon, match: (p: string) => p.startsWith("/messages") },
  {
    // /profile перенаправляет на свой /@username.
    href: "/profile",
    label: t.nav.profile,
    Icon: ProfileIcon,
    match: (p, me) => p.startsWith("/profile") || (!!me && (p === `/@${me}` || p === `/u/${me}`)),
  },
];
