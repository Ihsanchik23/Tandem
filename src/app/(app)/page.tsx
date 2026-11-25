import { Suspense } from "react";
import { FeedComingSoon } from "@/components/feed/FeedComingSoon";
import { GuestGate } from "@/components/guest/GuestGate";

// Лента появится позже; пока главная показывает заглушку. Без входа — гостевой экран.
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <GuestGate section="home">
        <FeedComingSoon />
      </GuestGate>
    </Suspense>
  );
}
