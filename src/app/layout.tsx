import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { t } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

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
    <html lang="ru" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
