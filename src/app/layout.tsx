import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { t } from "@/lib/i18n";
import { INTRO_SCRIPT, IntroGate } from "@/components/ui/Intro";
import "./globals.css";

export const metadata: Metadata = {
  title: t.app.name,
  description: t.app.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ffffff",
  // Чтобы нижняя панель учитывала «чёлку» и полоску жестов iPhone.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: скрипт ниже до загрузки React ставит html[data-intro].
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Suspense fallback={null}>
          <IntroGate />
        </Suspense>
      </body>
    </html>
  );
}
