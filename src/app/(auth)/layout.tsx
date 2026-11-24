import { t } from "@/lib/i18n";

// Общая рамка экранов входа: под телефон, по центру на широком экране.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center px-5 pb-10 pt-12 sm:justify-center sm:pt-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="text-xl font-semibold tracking-tight text-ink">{t.app.name}</p>
        {children}
      </div>
    </main>
  );
}
