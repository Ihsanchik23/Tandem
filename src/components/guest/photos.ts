// Фото-обложки: «Поиск», «Работа», «Сообщения» (HeroPanel), слайд-шоу входа, гостевые экраны.
// Подключены через import: Next сам знает размер, отдаёт WebP/AVIF нужной ширины
// и делает крошечную размытую копию (blur placeholder) — пока фото грузится, видна она.
// color — средний цвет фото (посчитан по самому фото): фон под картинкой, чтобы не было белого пятна.
// position — кадрирование (CSS object-position), чтобы лица оставались в кадре.
import type { StaticImageData } from "next/image";
import messagesHero from "../../../public/images/messages/messages-hero.jpg";
import profileHero from "../../../public/images/profile/profile-hero.jpg";
import searchHero from "../../../public/images/search/search-hero.jpg";
import workHero from "../../../public/images/work/work-hero.jpg";

export type SectionPhoto = { image: StaticImageData; color: string; position: string };

export const PHOTOS = {
  work: { image: workHero, color: "#6a4e38", position: "50% 35%" },
  search: { image: searchHero, color: "#6b4834", position: "50% 30%" },
  messages: { image: messagesHero, color: "#644b3f", position: "50% 15%" },
  profile: { image: profileHero, color: "#8a7c6d", position: "40% 40%" },
} as const satisfies Record<string, SectionPhoto>;

// Пустая прозрачная картинка внутри страницы. Ставится в <img>, когда фото для этой ширины
// экрана не нужно: без подходящего <source> браузер ничего не скачивает (тот же приём, что в HeroPanel).
export const EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
