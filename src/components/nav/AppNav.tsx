"use client";

import { usePathname } from "next/navigation";
import { AppNavView } from "./AppNavView";

export function AppNav({ myUsername }: { myUsername: string | null }) {
  const pathname = decodeURIComponent(usePathname() ?? "/");
  return <AppNavView pathname={pathname} myUsername={myUsername} />;
}
