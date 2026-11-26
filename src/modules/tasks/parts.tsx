"use client";

// Общие детали карточки задачи: просмотр, создание и редактирование выглядят одной системой.
// Шапка, свойства, поповер и кнопки теперь общие для всех карточек (components/ui/Card).
export { btnPrimary, btnSecondary, CardHeader, FieldPopover, Prop } from "@/components/ui/Card";

// Иконки свойств (те же в просмотре, создании и редактировании).
function PropSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]" aria-hidden>
      {children}
    </svg>
  );
}
export const FlagIcon = () => (
  <PropSvg>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </PropSvg>
);
export const UserIcon = () => (
  <PropSvg>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </PropSvg>
);
export const UsersIcon = () => (
  <PropSvg>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 6M17.5 14.2a5 5 0 0 1 3 4.8" />
  </PropSvg>
);
export const AuthorIcon = () => (
  <PropSvg>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z" />
  </PropSvg>
);
export const ClockIcon = () => (
  <PropSvg>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </PropSvg>
);
export const CheckCircleIcon = () => (
  <PropSvg>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.3 2.4 2.4 4.8-5" />
  </PropSvg>
);
export const TextIcon = () => (
  <PropSvg>
    <path d="M5 6h14M5 11h14M5 16h9" />
  </PropSvg>
);
