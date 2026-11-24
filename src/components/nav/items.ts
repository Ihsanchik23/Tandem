import { t } from "@/lib/i18n";
import { HomeIcon, MessagesIcon, ProfileIcon, SearchIcon, WorkIcon } from "./icons";

export const NAV_ITEMS = [
  { href: "/", label: t.nav.home, Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/search", label: t.nav.search, Icon: SearchIcon, match: (p: string) => p.startsWith("/search") },
  { href: "/work", label: t.nav.work, Icon: WorkIcon, match: (p: string) => p.startsWith("/work") },
  { href: "/messages", label: t.nav.messages, Icon: MessagesIcon, match: (p: string) => p.startsWith("/messages") },
  {
    // /profile перенаправляет на свой /@username.
    href: "/profile",
    label: t.nav.profile,
    Icon: ProfileIcon,
    match: (p: string) => p.startsWith("/profile") || p.startsWith("/@") || p.startsWith("/u/"),
  },
] as const;
