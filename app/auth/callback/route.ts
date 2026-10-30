import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, safeNextPath } from "@/lib/supabase/auth";
import { getServerClient } from "@/lib/supabase/server";

// Đích của magic link, xác nhận email, đặt lại mật khẩu và Google OAuth (luồng PKCE).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const sb = await getServerClient();
    const { error } = await exchangeCode(sb, code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=callback", origin));
}
