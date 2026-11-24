// Иконки Tandem (24×24, нарисованы под проект, без внешних библиотек).
// Активная иконка заливается градиентом бренда; обычная — контур цвета текста.
// Градиент задаётся один раз (IconGradientDefs) и подключается через url(#tandem-icon-gradient).
type IconProps = { className?: string; active?: boolean };

const GRADIENT = "url(#tandem-icon-gradient)";

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

// Свойства контура и заливки: активная — градиент, обычная — currentColor.
function look(active: boolean | undefined, fill = true) {
  return active
    ? { stroke: GRADIENT, strokeWidth: 2, fill: fill ? GRADIENT : "none" }
    : { stroke: "currentColor", strokeWidth: 1.75, fill: "none" };
}

// Один раз на страницу: определение градиента для иконок.
export function IconGradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient id="tandem-icon-gradient" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0" style={{ stopColor: "var(--tandem-grad-1)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--tandem-grad-2)" }} />
          <stop offset="1" style={{ stopColor: "var(--tandem-grad-3)" }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------- Разделы ----------
export function HomeIcon({ className, active }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 10.2 12 3.5l8 6.7V20a1 1 0 0 1-1 1h-4.5v-6.2h-5V21H5a1 1 0 0 1-1-1v-9.8Z" {...look(active)} />
    </Svg>
  );
}

export function SearchIcon({ className, active }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.5" {...look(active, false)} strokeWidth={active ? 2.5 : 1.75} />
      <path d="m20.5 20.5-4.9-4.9" {...look(active, false)} strokeWidth={active ? 2.5 : 1.75} />
    </Svg>
  );
}

export function WorkIcon({ className, active }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" {...look(active)} />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" {...look(active, false)} />
      <path d="M3 13h18" {...look(active, false)} style={active ? { stroke: "var(--tandem-canvas)" } : undefined} />
    </Svg>
  );
}

export function MessagesIcon({ className, active }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.6 0 2.1 1 4 2.6 5.4L5.4 20.5l3.8-1.7c.9.3 1.8.4 2.8.4 4.7 0 8.5-3.4 8.5-7.6S16.7 3.5 12 3.5Z"
        {...look(active)}
      />
    </Svg>
  );
}

export function ProfileIcon({ className, active }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="4.2" {...look(active)} />
      <path
        d={active ? "M4.2 20.6c.5-3.7 3.6-5.6 7.8-5.6s7.3 1.9 7.8 5.6Z" : "M4.2 20.6c.5-3.7 3.6-5.6 7.8-5.6s7.3 1.9 7.8 5.6"}
        {...look(active)}
      />
    </Svg>
  );
}

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
export function PanelCloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="3" {...line} />
      <path d="M9.5 4.5v15M16 10l-2 2 2 2" {...line} />
    </Svg>
  );
}

export function PanelOpenIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="3" {...line} />
      <path d="M9.5 4.5v15M14 10l2 2-2 2" {...line} />
    </Svg>
  );
}

// Значки рабочих страниц: чат и задачи.
export function ChatPageIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M12 4c-4.4 0-8 3.1-8 7 0 2 .9 3.7 2.4 5L5.5 20l3.600-1.600c.9.3 1.900.4 2.900.4 4.400 0 8-3.100 8-7s-3.600-7-8-7Z"
        {...line}
      />
    </Svg>
  );
}

export function TasksPageIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4" {...line} />
      <path d="m8.500 12.200 2.500 2.500 4.500-5" {...line} />
    </Svg>
  );
}
