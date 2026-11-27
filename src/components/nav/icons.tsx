// Иконки Tandem. Разделы навигации и иконки рабочей панели — Phosphor Icons (Regular, цвет текста);
// остальные — нарисованы под проект (24×24, контур цвета текста).
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Briefcase, ChatCircle, House, MagnifyingGlass, User } from "@phosphor-icons/react/ssr";

type IconProps = { className?: string; active?: boolean };

function Svg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

// ---------- Разделы (Phosphor, стиль Regular; у активного раздела — заливка того же цвета) ----------
const section = (Icon: PhosphorIcon) =>
  function SectionIcon({ className, active }: IconProps) {
    return <Icon weight={active ? "fill" : "regular"} className={className} aria-hidden />;
  };

export const HomeIcon = section(House);
export const SearchIcon = section(MagnifyingGlass);
export const WorkIcon = section(Briefcase);
export const MessagesIcon = section(ChatCircle);
export const ProfileIcon = section(User);

// ---------- Действия ----------
const line = { stroke: "currentColor", strokeWidth: 2, fill: "none" } as const;

export function MenuIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" {...line} />
    </Svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" {...line} />
    </Svg>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12h14" {...line} />
    </Svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m6 9.5 6 6 6-6" {...line} />
    </Svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" {...line} />
    </Svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m6 6 12 12M18 6 6 18" {...line} />
    </Svg>
  );
}

export function FitIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" {...line} />
    </Svg>
  );
}

export function UndoIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 8v5h5M4.6 13A8 8 0 1 0 7 6.6" {...line} />
    </Svg>
  );
}

// Панель слева: свернуть / развернуть.
// Значки модулей рабочих страниц: чат и задачи.
export function CompanyProfileIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" {...line} />
      <path d="M9 7.5h1M14 7.5h1M9 11.5h1M14 11.5h1M10 20.5v-5h4v5" {...line} />
    </Svg>
  );
}

export function StructureIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="9" y="3" width="6" height="5" rx="1" {...line} />
      <rect x="3" y="16" width="6" height="5" rx="1" {...line} />
      <rect x="15" y="16" width="6" height="5" rx="1" {...line} />
      <path d="M12 8v4M6 16v-4h12v4" {...line} />
    </Svg>
  );
}

export function PeopleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3" {...line} />
      <path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M16 5.2a3 3 0 0 1 0 5.6M17 14a5 5 0 0 1 3.5 4.8V20" {...line} />
    </Svg>
  );
}

export function ArchiveIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="5" rx="1.5" {...line} />
      <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" {...line} />
    </Svg>
  );
}

export function FilterIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 17h16" {...line} />
      <circle cx="9" cy="7" r="2" fill="white" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="17" r="2" fill="white" stroke="currentColor" strokeWidth="2" />
    </Svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" {...line} />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...line} />
    </Svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" {...line} />
    </Svg>
  );
}

// Глазок в поле пароля: «показать» (открытый глаз) и «скрыть» (перечёркнутый). Рисунок — как в eZone.
const eyeLine = { stroke: "currentColor", strokeWidth: 1.7, fill: "none" } as const;

export function EyeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" {...eyeLine} />
      <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" {...eyeLine} />
    </Svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 3l18 18" {...eyeLine} />
      <path d="M10.6 6.1A11.4 11.4 0 0 1 12 6c6.5 0 10 6 10 6a16.9 16.9 0 0 1-3 3.6" {...eyeLine} />
      <path d="M6.3 6.8C3.5 8.5 2 12 2 12s3.5 6 10 6c1.1 0 2.2-.2 3.2-.5" {...eyeLine} />
      <path d="M10 10a3 3 0 0 0 4 4" {...eyeLine} />
    </Svg>
  );
}
