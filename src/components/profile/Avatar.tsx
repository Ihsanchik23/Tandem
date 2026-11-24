import Image from "next/image";

type Props = {
  url: string | null | undefined;
  name: string;
  size?: number;
  alt?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

// Фото профиля или логотип. Если картинки нет — инициалы на сером фоне.
// Всегда круглое: и фото людей, и логотипы компаний.
export function Avatar({ url, name, size = 48, alt = "" }: Props) {
  const radius = "rounded-full";
  if (url) {
    return (
      <Image
        src={url}
        alt={alt}
        width={size}
        height={size}
        // Картинки уже сжаты при загрузке — отдаём как есть.
        unoptimized
        className={`${radius} shrink-0 bg-neutral-100 object-cover`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden={alt ? undefined : true}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      className={`${radius} inline-flex shrink-0 items-center justify-center bg-neutral-200 font-medium text-ink`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }}
    >
      {initials(name)}
    </span>
  );
}
