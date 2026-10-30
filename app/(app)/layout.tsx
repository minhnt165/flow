import { redirect } from "next/navigation";
import { AppDialogs } from "@/components/app-dialogs";
import { MobileTabs } from "@/components/layout/mobile-tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { DEMO_USER } from "@/lib/demo/fixtures";
import { DEMO_MODE } from "@/lib/demo/mode";
import { getCurrentUser } from "@/lib/supabase/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getProfile } from "@/lib/supabase/profiles";
import { getServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadAccount() {
  if (DEMO_MODE) return { name: "Minh", email: DEMO_USER.email };
  if (!hasSupabaseEnv) redirect("/login");
  const sb = await getServerClient();
  const user = await getCurrentUser(sb);
  if (!user) redirect("/login");

  const profile = await getProfile(sb).catch(() => null);
  // Lần đầu đăng nhập: hỏi ngày nhận lương trước khi vào app.
  if (profile && profile.salary_day === null) redirect("/onboarding");
  const email = user.email ?? "";
  return { name: profile?.display_name || email.split("@")[0] || "Bạn", email };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { name, email } = await loadAccount();
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar name={name} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <MobileTabs />
      <AppDialogs />
    </div>
  );
}
