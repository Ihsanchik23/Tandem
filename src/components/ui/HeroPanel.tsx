import { getImageProps } from "next/image";
import type { ReactNode } from "react";

// Фото на всю правую область (компьютер) и крупный белый заголовок поверх.
// Используется в пустых состояниях: «Поиск» (ничего не выбрано) и «Работа» (нет компании).
//
// На телефоне этих панелей нет, и фото не должно даже скачиваться. Поэтому ссылка на фото есть
// только у <source> для ширины от 768px, а у запасного <img> — пустая прозрачная картинка
// прямо внутри страницы: без подходящего <source> браузер никуда не ходит.
const EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  /** Ширина фото на экране — для выбора размера картинки (атрибут sizes). */
  sizes: string;
  /** Где заголовок: вверху на ровном затемнении или внизу на градиенте. */
  placement: "top" | "bottom";
  /** Какой уровень у заголовка: h1, если это главный заголовок страницы. */
  headingLevel?: 1 | 2;
  /** Кадрирование фото (CSS object-position), чтобы лица оставались в кадре. */
  objectPosition?: string;
  /** Короткое сообщение поверх фото, вверху (например, «Вы вышли из компании»). */
  notice?: ReactNode;
};

export function HeroPanel({ src, width, height, alt, title, sizes, placement, headingLevel = 2, objectPosition = "50% 30%", notice }: Props) {
  const {
    props: { srcSet, sizes: imgSizes, ...rest },
  } = getImageProps({ src, width, height, alt, sizes });
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <div className={`hero-panel hero-panel--${placement} relative isolate flex w-full flex-1 flex-col overflow-hidden`}>
      <picture>
        <source media="(min-width: 768px)" srcSet={srcSet} sizes={imgSizes} />
        <img
          {...rest}
          src={EMPTY_PIXEL}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          style={{ objectPosition }}
          className="hero-panel-photo absolute inset-0 -z-10 h-full w-full object-cover"
        />
      </picture>
      <div aria-hidden className="hero-panel-shade absolute -z-10" />
      {notice ? <div className="hero-panel-notice">{notice}</div> : null}
      <Heading className="hero-panel-title">{title}</Heading>
    </div>
  );
}
