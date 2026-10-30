import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Glow } from "@/components/common/glow";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/supabase/profiles";
import { getServerClient } from "@/lib/supabase/server";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.onboarding.title };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const sb = await getServerClient();
  const user = await getCurrentUser(sb);
  if (!user) redirect("/login");
  const profile = await getProfile(sb);
  if (profile?.salary_day) redirect("/");
  const name = profile?.display_name || user.email?.split("@")[0] || "bạn";

  return (
    <main className="relative flex min-h-dvh justify-center overflow-hidden px-6 py-10 md:items-center">
      <Glow className="-top-[160px] -right-[120px]" />
      <div className="relative flex w-full max-w-[440px] flex-col gap-8">
        <Logo size={36} />
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-display text-[28px] font-bold tracking-[-0.6px]">
            {t.onboarding.title}
          </h1>
          <p className="m-0 text-sm text-muted-foreground">{t.onboarding.greeting(name)}</p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
