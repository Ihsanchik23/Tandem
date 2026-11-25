import { getImageProps } from "next/image";
import type { ReactNode } from "react";
import { EMPTY_PIXEL, type SectionPhoto } from "@/components/guest/photos";

// Фото на всю правую область (компьютер), ровное затемнение и крупный белый заголовок вверху слева.
// Используется в пустых состояниях: «Поиск» (ничего не выбрано), «Работа» (нет компании), «Сообщения».
//
// На телефоне этих панелей нет, и фото не должно даже скачиваться. Поэтому ссылка на фото есть
// только у <source> для ширины от 768px, а у запасного <img> — пустая прозрачная картинка
// прямо внутри страницы: без подходящего <source> браузер никуда не ходит.
// Пока фото грузится, видны средний цвет фото и его размытая копия — без белого пятна.

type Props = {
  photo: SectionPhoto;
  alt: string;
  title: string;
  /** Ширина фото на экране — для выбора размера картинки (атрибут sizes). */
  sizes: string;
  /** Какой уровень у заголовка: h1, если это главный заголовок страницы. */
  headingLevel?: 1 | 2;
  /** Короткое сообщение поверх фото, вверху (например, «Вы вышли из компании»). */
  notice?: ReactNode;
};

export function HeroPanel({ photo, alt, title, sizes, headingLevel = 2, notice }: Props) {
  const {
    props: { srcSet, sizes: imgSizes, style, ...rest },
  } = getImageProps({ src: photo.image, alt, sizes, placeholder: "blur" });
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <div className="hero-panel relative isolate flex w-full flex-1 flex-col overflow-hidden" style={{ backgroundColor: photo.color }}>
      <picture>
        <source media="(min-width: 768px)" srcSet={srcSet} sizes={imgSizes} />
        <img
          {...rest}
          src={EMPTY_PIXEL}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          style={{ ...style, objectPosition: photo.position }}
          className="hero-panel-photo absolute inset-0 -z-10 h-full w-full object-cover"
        />
      </picture>
      <div aria-hidden className="hero-panel-shade absolute inset-0 -z-10" />
      {notice ? <div className="hero-panel-notice">{notice}</div> : null}
      <Heading className="hero-panel-title">{title}</Heading>
    </div>
  );
}
