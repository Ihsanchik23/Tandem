import { t } from "@/lib/i18n";
import { BrandMark } from "@/components/ui/BrandMark";

// Предпросмотр приглашения открывается и без входа — своя простая рамка без навигации.
export default function InviteLayout({ children }: LayoutProps<"/invite">) {
  return (
    <main className="flex flex-1 flex-col items-center px-5 pb-10 pt-12 sm:justify-center sm:pt-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-ink">
          <BrandMark size={32} className="h-8 w-8" />
          {t.app.name}
        </p>
        {children}
      </div>
    </main>
  );
}
