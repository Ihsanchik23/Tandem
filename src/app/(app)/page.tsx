import Image from "next/image";
import { t } from "@/lib/i18n";

// Лента появится позже; пока главная встречает коротким пустым состоянием.
export default function HomePage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col px-5 pb-8 pt-5 md:pt-10">
      <h1 data-page-title className="text-2xl font-semibold tracking-tight text-ink">
        {t.home.title}
      </h1>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 pb-6 pt-8 md:gap-6 md:pb-12">
        <Image
          src="/home-feed.webp"
          width={1448}
          height={1086}
          sizes="(max-width: 767px) calc(100vw - 40px), 580px"
          alt=""
          loading="eager"
          className="h-auto w-full max-w-[580px] object-contain"
        />
        <h2 className="max-w-xs text-center text-3xl font-semibold leading-tight tracking-tight text-ink md:max-w-none md:text-4xl">
          {t.home.placeholder}
        </h2>
      </div>
    </main>
  );
}
