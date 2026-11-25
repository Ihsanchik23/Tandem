import type { ReactNode } from "react";
import { getUserId } from "@/lib/auth/session";
import { GuestScreen, type GuestSection } from "./GuestScreen";

// Вошёл — показываем раздел. Нет — гостевой экран, и содержимое раздела даже не рендерится,
// поэтому запросов к данным нет. Ставить внутри <Suspense>: здесь читаются cookies.
export async function GuestGate({ section, children }: { section: GuestSection; children: ReactNode }) {
  const userId = await getUserId();
  return userId ? children : <GuestScreen section={section} />;
}
