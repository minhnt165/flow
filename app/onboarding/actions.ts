"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getDefaultFund, updateFund } from "@/lib/supabase/funds";
import { updateProfile } from "@/lib/supabase/profiles";
import { getServerClient } from "@/lib/supabase/server";
import { t } from "@/messages/vi";

export type OnboardingState = { error?: string };

export async function completeOnboarding(
  _prev: OnboardingState,
  form: FormData,
): Promise<OnboardingState> {
  const salaryDay = Number(form.get("salaryDay"));
  const budget = Number(form.get("budget") ?? 0);
  if (!Number.isInteger(salaryDay) || salaryDay < 1 || salaryDay > 31) {
    return { error: t.onboarding.errorDay };
  }

  const sb = await getServerClient();
  const user = await getCurrentUser(sb);
  if (!user) redirect("/login");

  try {
    await updateProfile(sb, user.id, { salary_day: salaryDay });
    if (budget > 0) {
      const fund = await getDefaultFund(sb);
      if (fund) await updateFund(sb, fund.id, { monthly_budget: budget });
    }
  } catch {
    return { error: t.auth.errors.generic };
  }
  redirect("/expenses");
}
