// Плотные белые пиктограммы для цветных кругов панели «Работа».
// Используются только здесь: остальные иконки приложения сохраняют свой контурный стиль.
export type SidebarGlyphKind = "tasks" | "chat" | "profile" | "structure" | "people" | "archive";

export function SidebarGlyph({ kind, cutout }: { kind: SidebarGlyphKind; cutout: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden focusable="false" className="h-7 w-7">
      {kind === "tasks" && (
        <>
          <rect x="5" y="7" width="19" height="21" rx="3.5" fill="white" opacity=".45" />
          <rect x="8" y="4" width="19" height="22" rx="3.5" fill="white" />
          <path d="m13 15.5 3 3 6-6" stroke={cutout} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "chat" && (
        <>
          <path d="M9 5h14a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5H13l-5 4v-4a5 5 0 0 1-4-5v-9a5 5 0 0 1 5-5Z" fill="white" opacity=".48" />
          <path d="M9 8h13a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-8l-6 4v-4a5 5 0 0 1-4-5v-7a5 5 0 0 1 5-5Z" fill="white" />
          <rect x="9" y="15" width="13" height="2.4" rx="1.2" fill={cutout} opacity=".75" />
          <rect x="9" y="19.2" width="8" height="2.4" rx="1.2" fill={cutout} opacity=".75" />
        </>
      )}
      {kind === "profile" && (
        <>
          <rect x="6" y="6" width="20" height="22" rx="3" fill="white" />
          <rect x="10" y="10" width="4" height="4" rx="1" fill={cutout} opacity=".8" />
          <rect x="18" y="10" width="4" height="4" rx="1" fill={cutout} opacity=".8" />
          <rect x="10" y="17" width="4" height="4" rx="1" fill={cutout} opacity=".8" />
          <rect x="18" y="17" width="4" height="4" rx="1" fill={cutout} opacity=".8" />
          <path d="M14 28v-5a2 2 0 0 1 4 0v5" fill={cutout} />
        </>
      )}
      {kind === "structure" && (
        <>
          <path d="M16 12v6M8 18v-3h16v3" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".75" />
          <rect x="11" y="4" width="10" height="9" rx="2.5" fill="white" />
          <rect x="3" y="19" width="10" height="9" rx="2.5" fill="white" />
          <rect x="19" y="19" width="10" height="9" rx="2.5" fill="white" />
        </>
      )}
      {kind === "people" && (
        <>
          <circle cx="21.5" cy="11" r="4" fill="white" opacity=".55" />
          <path d="M17.5 18c5.5 0 9 3.7 9 8H18v-8Z" fill="white" opacity=".55" />
          <circle cx="11" cy="11" r="5" fill="white" />
          <path d="M2 27c0-5.3 3.7-9 9-9s9 3.7 9 9v1H2v-1Z" fill="white" />
        </>
      )}
      {kind === "archive" && (
        <>
          <rect x="5" y="6" width="22" height="6" rx="2" fill="white" opacity=".7" />
          <path d="M7 12h18v13a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V12Z" fill="white" />
          <rect x="12" y="17" width="8" height="2.5" rx="1.25" fill={cutout} opacity=".8" />
        </>
      )}
    </svg>
  );
}
