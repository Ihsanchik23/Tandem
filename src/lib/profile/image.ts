// Сжатие фото в браузере перед загрузкой (ТЗ: «сжатие при загрузке»).
// Квадрат по центру 512×512, JPEG — так фото весит ~50–150 КБ вместо мегабайт.
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_MAX_SOURCE_BYTES = 15 * 1024 * 1024; // исходник с камеры телефона
const SIZE = 512;

export async function compressAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const target = Math.min(SIZE, side);

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff"; // прозрачный PNG → белый фон
  ctx.fillRect(0, 0, target, target);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/jpeg", 0.85),
  );
}
