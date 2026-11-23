import { t } from "@/lib/i18n";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t.app.name}</h1>
      <p className="text-lg text-neutral-700">{t.app.tagline}</p>
      <p className="max-w-sm text-base text-neutral-500">{t.app.description}</p>
      <p className="mt-4 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
        {t.app.comingSoon}
      </p>
    </main>
  );
}
