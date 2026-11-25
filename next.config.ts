import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Профиль открывается по адресу /@username (ТЗ, раздел 7). Папку с «@» в Next.js
  // создать нельзя (так обозначаются слоты), поэтому адрес переадресуется на /u/username.
  async rewrites() {
    return [{ source: "/@:username", destination: "/u/:username" }];
  },
  cacheComponents: true,
  experimental: {
    // Уже открытые страницы 5 минут показываются из памяти браузера мгновенно.
    // Свои изменения видны сразу: действия сбрасывают кэш (lib/cache/revalidate.ts),
    // вход и выход меняют cookies — Next при этом тоже очищает кэш браузера.
    // Задачи и чат приходят через Realtime. Чужие изменения в «Работе» (доступ к страницам,
    // новые сотрудники, правки структуры) видны после обновления страницы или через 5 минут.
    staleTimes: { dynamic: 300 },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
