"use client";

import { usePathname } from "next/navigation";
import { useTrackNavigation } from "@/lib/nav/history";
import { AppNavView } from "./AppNavView";

export function AppNav({ myUsername, isGuest = false }: { myUsername: string | null; isGuest?: boolean }) {
  const pathname = decodeURIComponent(usePathname() ?? "/");
  useTrackNavigation();
  return <AppNavView pathname={pathname} myUsername={myUsername} isGuest={isGuest} unread={!isGuest} />;
}
