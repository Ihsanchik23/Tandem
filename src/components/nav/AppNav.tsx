"use client";

import { usePathname } from "next/navigation";
import { AppNavView } from "./AppNavView";

export function AppNav({ myUsername, isGuest = false }: { myUsername: string | null; isGuest?: boolean }) {
  const pathname = decodeURIComponent(usePathname() ?? "/");
  return <AppNavView pathname={pathname} myUsername={myUsername} isGuest={isGuest} unread={!isGuest} />;
}
