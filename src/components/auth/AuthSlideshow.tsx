"use client";

import { getImageProps } from "next/image";
import { useState, useSyncExternalStore } from "react";
import { format, t } from "@/lib/i18n";
import { EMPTY_PIXEL, PHOTOS } from "@/components/guest/photos";

// Слайд-шоу слева на экранах входа (только компьютер, от 1024px).
// Каждое фото держится 4 секунды, затем плавная смена. Полоски внизу — как в Stories:
// текущая заполняется за 4 секунды (CSS-анимация), по её окончании включается следующий слайд.
// Клик по полоске — переход к этому фото. При «уменьшить движение» — без автосмены.
const SLIDES = [PHOTOS.work, PHOTOS.search, PHOTOS.messages, PHOTOS.profile].map((photo, i) => ({
  photo,
  ...t.auth.slides[i],
}));

// Фото скачиваются только на компьютере: ссылка есть лишь у <source> для ширины от 1024px.
const DESKTOP = "(min-width: 1024px)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function AuthSlideshow() {
  const [index, setIndex] = useState(0);
  // На сервере считаем, что движение уменьшено: полоска начнёт идти только после загрузки скриптов.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const current = SLIDES[index];

  return (
    <section
      aria-label={t.auth.slideshowLabel}
      aria-roledescription="carousel"
      className="auth-slides relative isolate flex h-full w-full flex-col justify-end overflow-hidden rounded-3xl"
      // Средний цвет первого фото — пока оно грузится, вместо белого пятна.
      style={{ backgroundColor: SLIDES[0].photo.color }}
    >
      {SLIDES.map(({ photo, alt }, i) => {
        const {
          props: { srcSet, sizes, style, ...rest },
        } = getImageProps({ src: photo.image, alt, sizes: "50vw", placeholder: "blur" });
        const active = i === index;
        return (
          <picture key={photo.image.src}>
            <source media={DESKTOP} srcSet={srcSet} sizes={sizes} />
            <img
              {...rest}
              src={EMPTY_PIXEL}
              alt={active ? alt : ""}
              aria-hidden={active ? undefined : true}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              data-active={active}
              style={{ ...style, objectPosition: photo.position }}
              className="auth-slide-photo absolute inset-0 -z-10 h-full w-full object-cover"
            />
          </picture>
        );
      })}
      <div aria-hidden className="auth-slides-shade absolute inset-0 -z-10" />

      <div aria-live={reducedMotion ? "polite" : "off"} className="px-10 pb-6 xl:px-12">
        <div key={index} className="auth-slides-copy">
          <h2 className="auth-slides-title">{current.title}</h2>
          <p className="auth-slides-text">{current.text}</p>
        </div>
      </div>

      <div className="flex gap-2 px-10 pb-8 xl:px-12">
        {SLIDES.map(({ photo }, i) => {
          const state = i < index || (i === index && reducedMotion) ? "done" : i === index ? "running" : "empty";
          return (
            <button
              key={photo.image.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={format(t.auth.slideLabel, { n: i + 1, total: SLIDES.length })}
              aria-current={i === index ? "true" : undefined}
              className="group flex h-6 flex-1 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="auth-slides-bar block h-[3px] w-full overflow-hidden rounded-full">
                <span
                  // Новый key — анимация заполнения начинается заново.
                  key={i === index ? `run-${index}` : "idle"}
                  data-state={state}
                  onAnimationEnd={state === "running" ? () => setIndex((index + 1) % SLIDES.length) : undefined}
                  className="auth-slides-bar-fill block h-full w-full"
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
