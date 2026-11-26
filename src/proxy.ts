import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Локальный предпросмотр панели работает без сессии и не доступен в production.
  if (process.env.NODE_ENV === "development" && request.nextUrl.pathname === "/work-preview") {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Все пути, кроме статики и картинок.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
