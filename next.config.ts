import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Профиль открывается по адресу /@username (ТЗ, раздел 7). Папку с «@» в Next.js
  // создать нельзя (так обозначаются слоты), поэтому адрес переадресуется на /u/username.
  async rewrites() {
    return [{ source: "/@:username", destination: "/u/:username" }];
  },
  cacheComponents: true,
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
