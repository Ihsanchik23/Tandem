"use client";

import { useEffect } from "react";
import { markPageSeen } from "./seen";

// Открыл страницу — метка «Новая» больше не показывается.
export function MarkSeen({ pageId }: { pageId: string }) {
  useEffect(() => markPageSeen(pageId), [pageId]);
  return null;
}
