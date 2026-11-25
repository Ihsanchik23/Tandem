// Фото разделов: слайд-шоу на экранах входа (компьютер) и гостевые экраны (телефон).
// position — кадрирование (CSS object-position), чтобы лица оставались в кадре.
export type SectionPhoto = { src: string; width: number; height: number; position: string };

export const PHOTOS = {
  work: { src: "/images/work/work-hero.jpg", width: 2352, height: 1760, position: "50% 35%" },
  search: { src: "/images/search/search-hero.jpg", width: 1760, height: 2352, position: "50% 30%" },
  messages: { src: "/images/messages/messages-hero.jpg", width: 1760, height: 2352, position: "50% 15%" },
  profile: { src: "/images/profile/profile-hero.jpg", width: 1760, height: 2352, position: "40% 40%" },
} as const satisfies Record<string, SectionPhoto>;

// Пустая прозрачная картинка внутри страницы. Ставится в <img>, когда фото для этой ширины
// экрана не нужно: без подходящего <source> браузер ничего не скачивает (тот же приём, что в HeroPanel).
export const EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
