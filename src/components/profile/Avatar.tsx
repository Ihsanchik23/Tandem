import Image from "next/image";

type Props = {
  url: string | null | undefined;
  name: string;
  size?: number;
  shape?: "circle" | "rounded";
  alt?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

// Фото профиля или логотип. Если картинки нет — инициалы на сером фоне.
export function Avatar({ url, name, size = 48, shape = "circle", alt = "" }: Props) {
  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";
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
      className={`${radius} inline-flex shrink-0 items-center justify-center bg-neutral-200 font-medium text-neutral-600`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }}
    >
      {initials(name)}
    </span>
  );
}
