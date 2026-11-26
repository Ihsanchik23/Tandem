import { notFound } from "next/navigation";
import { AppNavView } from "@/components/nav/AppNavView";
import { MobileHeader } from "@/components/nav/MobileHeader";
import { WorkPanel } from "@/components/nav/WorkPanel";
import type { ShellData } from "@/lib/nav/shell";

const previewData: ShellData = {
  userId: "preview",
  username: "preview",
  company: { name: "AEN", slug: "preview", logoUrl: null, role: "owner" },
  pages: [
    { id: "preview-1", name: "Задачи", moduleKey: "tasks", createdAt: "2026-01-01", createdBy: "preview" },
    { id: "preview-2", name: "Задачи команды", moduleKey: "tasks", createdAt: "2026-01-01", createdBy: "preview" },
    { id: "preview-3", name: "Чат", moduleKey: "chat", createdAt: "2026-01-01", createdBy: "preview" },
    { id: "preview-4", name: "Чат отдела", moduleKey: "chat", createdAt: "2026-01-01", createdBy: "preview" },
    { id: "preview-5", name: "Задачи проекта", moduleKey: "tasks", createdAt: "2026-01-01", createdBy: "preview" },
  ],
};

export default function WorkPreview() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-white pb-16 md:pb-0 md:pl-16">
      <AppNavView pathname="/work" myUsername={previewData.username} />
      <div className="flex flex-1">
        <WorkPanel data={previewData} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader data={previewData} />
          <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10 text-ink md:py-16">
            <h1 className="text-3xl font-semibold max-md:hidden">Работа</h1>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">Быстрый старт</h2>
              {['Создать структуру', 'Пригласить людей', 'Создать страницу'].map((label) => (
                <div key={label} className="rounded-xl border border-neutral-300 px-4 py-3 text-base font-medium">
                  {label}
                </div>
              ))}
            </section>
            <p className="text-sm text-muted">Предпросмотр боковой панели с примерными страницами.</p>
          </main>
        </div>
      </div>
    </div>
  );
}
