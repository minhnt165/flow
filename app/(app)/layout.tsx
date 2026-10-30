import { redirect } from "next/navigation";
import { MobileTabs } from "@/components/layout/mobile-tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/supabase/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getProfile } from "@/lib/supabase/profiles";
import { getServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv) redirect("/login");
  const sb = await getServerClient();
  const user = await getCurrentUser(sb);
  if (!user) redirect("/login");

  const profile = await getProfile(sb).catch(() => null);
  // Lần đầu đăng nhập: hỏi ngày nhận lương trước khi vào app.
  if (profile && profile.salary_day === null) redirect("/onboarding");
  const email = user.email ?? "";
  const name = profile?.display_name || email.split("@")[0] || "Bạn";

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar name={name} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <MobileTabs />
    </div>
  );
}
