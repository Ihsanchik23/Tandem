import Image from "next/image";

// Фирменный знак Tandem (только иконка, без надписи). Рядом всегда стоит название, поэтому alt пустой.
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return <Image src="/brand/tandem-mark.png" alt="" width={size} height={size} priority className={className} />;
}
