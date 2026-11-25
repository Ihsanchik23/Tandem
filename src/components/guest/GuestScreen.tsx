import { getImageProps } from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { withNext, type GuestSection } from "@/lib/auth/redirect";
import { t } from "@/lib/i18n";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormFallback } from "@/components/auth/FormFallback";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandMark } from "@/components/ui/BrandMark";
import { EMPTY_PIXEL, PHOTOS } from "./photos";


const PATHS: Record<GuestSection, string> = {
  home: "/",
  search: "/search",
  work: "/work",
  messages: "/messages",
  profile: "/profile",
};

const ALTS = {
  search: t.catalog.heroAlt,
  work: t.work.heroAlt,
  messages: t.messages.heroAlt,
  profile: t.guest.profileAlt,
} as const;

// Что видит гость (без входа) в одном из пяти разделов. Данных платформы здесь нет.
// Телефон (до 1024px): фото раздела на весь экран, заголовок и кнопки «Войти» / «Зарегистрироваться»;
// нижняя навигация остаётся — можно ходить по разделам.
// Компьютер: экран входа со слайд-шоу поверх всего — тот же, что на /login.
export function GuestScreen({ section }: { section: GuestSection }) {
  // С «Главной» после входа — обычным путём (в «Работу»), из остальных разделов — обратно в раздел.
  const next = section === "home" ? null : PATHS[section];
  const copy = t.guest[section];

  return (
    <>
      {section === "home" ? (
        <main className="guest-screen guest-screen-light flex flex-1 flex-col px-5 pb-6 lg:hidden">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <BrandMark size={96} className="h-24 w-24" />
            <div>
              <h1 className="guest-screen-title">{copy.title}</h1>
              <p className="guest-screen-subtitle">{copy.subtitle}</p>
            </div>
          </div>
          <GuestButtons next={next} light />
        </main>
      ) : (
        <main
          className="guest-screen relative isolate flex flex-1 flex-col justify-end overflow-hidden px-5 pb-6 lg:hidden"
          // Средний цвет фото — пока оно грузится, вместо пустого фона.
          style={{ backgroundColor: PHOTOS[section].color }}
        >
          <GuestPhoto section={section} />
          <div aria-hidden className="guest-screen-shade absolute inset-0 -z-10" />
          <div className="mb-6">
            <h1 className="guest-screen-title">{copy.title}</h1>
            <p className="guest-screen-subtitle">{copy.subtitle}</p>
          </div>
          <GuestButtons next={next} />
        </main>
      )}

      <div className="fixed inset-0 z-50 hidden overflow-y-auto bg-canvas lg:flex">
        <AuthShell>
          <Suspense fallback={<FormFallback />}>
            <LoginForm next={next ?? undefined} />
          </Suspense>
        </AuthShell>
      </div>
    </>
  );
}

// Фото только для телефона: на компьютере оно не скачивается.
function GuestPhoto({ section }: { section: Exclude<GuestSection, "home"> }) {
  const photo = PHOTOS[section];
  const {
    props: { srcSet, sizes, style, ...rest },
  } = getImageProps({ src: photo.image, alt: ALTS[section], sizes: "100vw", placeholder: "blur" });
  return (
    <picture>
      <source media="(max-width: 1023.98px)" srcSet={srcSet} sizes={sizes} />
      <img
        {...rest}
        src={EMPTY_PIXEL}
        alt={ALTS[section]}
        loading="eager"
        fetchPriority="high"
        style={{ ...style, objectPosition: photo.position }}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
    </picture>
  );
}

function GuestButtons({ next, light = false }: { next: string | null; light?: boolean }) {
  const base =
    "inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <div className="flex flex-col gap-3">
      <Link href={withNext("/login", next)} className={`${base} bg-brand text-white hover:bg-brand-hover focus-visible:outline-accent`}>
        {t.guest.login}
      </Link>
      <Link
        href={withNext("/signup", next)}
        className={`${base} border ${
          light
            ? "border-ink text-ink hover:bg-neutral-50 focus-visible:outline-accent"
            : "border-white text-white hover:bg-white/10 focus-visible:outline-white"
        }`}
      >
        {t.guest.signup}
      </Link>
    </div>
  );
}
