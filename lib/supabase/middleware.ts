import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/demo/mode";
import { hasSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth/"];
const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p));
}

// Làm mới cookie phiên Supabase và chặn route cần đăng nhập.
export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv || DEMO_MODE) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims xác minh JWT tại chỗ (không gọi Auth server) khi project bật khóa ký bất đối xứng;
  // chưa bật thì tự rơi về getUser. Middleware chỉ cần biết có phiên hay không.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;
  const { pathname, search } = request.nextUrl;

  if (!user && !matches(pathname, PUBLIC_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (user && matches(pathname, GUEST_ONLY_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
