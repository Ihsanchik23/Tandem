// Кнопка «Профиль» в навигации: ведёт на свой /@username.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.redirect(new URL("/login", request.url));

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  const target = profile ? `/@${profile.username}` : "/";
  return NextResponse.redirect(new URL(target, request.url));
}
