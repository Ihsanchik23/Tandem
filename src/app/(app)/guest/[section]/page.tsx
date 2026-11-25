import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestScreen } from "@/components/guest/GuestScreen";
import { GUEST_SECTIONS, type GuestSection } from "@/lib/auth/redirect";
import { t } from "@/lib/i18n";

// Гостевой экран раздела (без входа). Сюда незаметно для адреса ведёт proxy.ts:
// гость открывает /search — видит эту страницу, адрес остаётся /search.
// Страница статичная: ни cookies, ни данных платформы.
const SECTIONS = Object.values(GUEST_SECTIONS);

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

const TITLES: Record<GuestSection, string> = {
  home: t.app.name,
  search: `${t.nav.search} — ${t.app.name}`,
  work: `${t.nav.work} — ${t.app.name}`,
  messages: `${t.nav.messages} — ${t.app.name}`,
  profile: `${t.nav.profile} — ${t.app.name}`,
};

function asSection(value: string): GuestSection | null {
  return (SECTIONS as string[]).includes(value) ? (value as GuestSection) : null;
}

export async function generateMetadata({ params }: PageProps<"/guest/[section]">): Promise<Metadata> {
  const section = asSection((await params).section);
  return section ? { title: TITLES[section] } : {};
}

export default async function GuestPage({ params }: PageProps<"/guest/[section]">) {
  const section = asSection((await params).section);
  if (!section) notFound();
  return <GuestScreen section={section} />;
}
