import { isAuthRetryableFetchError, type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, safeNextPath, verifyEmailToken } from "@/lib/supabase/auth";
import { getServerClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

// Đích của magic link, xác nhận email, đặt lại mật khẩu và Google OAuth.
// Nhận cả ?code= (luồng PKCE) lẫn ?token_hash=&type= (mẫu email trong docs/SETUP.md).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = EMAIL_OTP_TYPES.find((t) => t === searchParams.get("type"));
  const next = type === "recovery" ? "/reset-password" : safeNextPath(searchParams.get("next"));

  // Supabase báo lỗi ngay trên URL (link hết hạn, Google từ chối, sai client secret...).
  let reason = searchParams.get("error_code") ?? searchParams.get("error");
  if (reason) {
    console.error("[auth/callback]", reason, searchParams.get("error_description"));
  } else if (code || (tokenHash && type)) {
    const sb = await getServerClient();
    const { error } = code
      ? await exchangeCode(sb, code)
      : await verifyEmailToken(sb, tokenHash!, type!);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("[auth/callback]", error.code ?? error.name, error.message);
    reason = error.code ?? (isAuthRetryableFetchError(error) ? "network" : "unknown");
  } else {
    reason = "missing_code";
  }

  const url = new URL("/login", origin);
  url.searchParams.set("error", "callback");
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}
