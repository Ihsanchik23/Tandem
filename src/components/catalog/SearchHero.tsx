import { getImageProps } from "next/image";
import { t } from "@/lib/i18n";

// Пустая правая панель «Поиска» (компьютер): фото на всю колонку и подпись поверх.
// На телефоне панели нет, и фото не должно даже скачиваться. Поэтому ссылка на фото есть
// только у <source> для ширины от 768px, а у запасного <img> — пустая прозрачная картинка
// прямо внутри страницы: без подходящего <source> браузер никуда не ходит.
const EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function SearchHero() {
  const {
    props: { srcSet, sizes, ...rest },
  } = getImageProps({
    src: "/images/search/search-hero.jpg",
    width: 1760,
    height: 2352,
    alt: t.catalog.heroAlt,
    // Колонка = экран минус меню слева (64px) и список (400px, с 1280px — 460px).
    sizes: "(min-width: 1280px) calc(100vw - 524px), calc(100vw - 464px)",
  });

  return (
    <div className="search-hero relative isolate flex w-full flex-1 items-end overflow-hidden">
      <picture>
        <source media="(min-width: 768px)" srcSet={srcSet} sizes={sizes} />
        <img
          {...rest}
          src={EMPTY_PIXEL}
          alt={t.catalog.heroAlt}
          loading="eager"
          fetchPriority="high"
          className="search-hero-photo absolute inset-0 -z-10 h-full w-full object-cover"
        />
      </picture>
      <div aria-hidden className="search-hero-shade absolute inset-x-0 bottom-0 -z-10 h-[40%]" />
      <h2 className="search-hero-title">{t.catalog.emptyPreviewTitle}</h2>
    </div>
  );
}
