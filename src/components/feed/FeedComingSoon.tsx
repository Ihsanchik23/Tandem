import { getImageProps } from "next/image";
import { t } from "@/lib/i18n";

// Заглушка на месте ленты: рекламное фото на весь экран и одна фраза.
// Когда лента будет готова, главная просто покажет её вместо этого компонента.
// Фото разное для телефона (вертикальное) и компьютера (горизонтальное) — через <picture>.
export function FeedComingSoon() {
  const common = { alt: t.home.heroAlt, sizes: "100vw", quality: 80 };
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: "/images/hero/hero-desktop.png", width: 2720, height: 1536 });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: "/images/hero/hero-mobile.png", width: 1536, height: 2720 });

  return (
    <main className="feed-hero relative isolate flex flex-1 flex-col overflow-hidden">
      <picture>
        <source media="(min-width: 768px)" srcSet={desktop} />
        <source srcSet={mobile} />
        <img
          {...rest}
          alt={common.alt}
          loading="eager"
          fetchPriority="high"
          className="feed-hero-photo absolute inset-0 -z-10 h-full w-full object-cover"
        />
      </picture>
      <div className="feed-hero-copy">
        <h1 className="feed-hero-title">
          {t.home.heroTitle} <span className="text-accent">{t.home.heroAccent}</span>
        </h1>
      </div>
    </main>
  );
}
