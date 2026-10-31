"use client";

import { useState } from "react";
import { toast } from "sonner";
import { logout } from "@/app/auth/actions";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import type { Profile } from "@/lib/supabase/types";
import { t } from "@/messages/vi";

const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 disabled:opacity-60 md:text-[15px]";

function AccountForm({ profile, email }: { profile: Profile; email: string }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(profile.display_name ?? "");
  const [day, setDay] = useState(profile.salary_day ?? 1);
  const a = t.settings.account;
  const dirty = name.trim() !== (profile.display_name ?? "") || day !== profile.salary_day;

  return (
    <form
      className="flex max-w-[560px] flex-col gap-[18px] card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          { id: profile.id, patch: { display_name: name.trim() || null, salary_day: day } },
          {
            onSuccess: () => toast.success(t.settings.saved),
            onError: () => toast.error(t.settings.saveError),
          },
        );
      }}
    >
      <h2 className="m-0 text-[15px] font-semibold">{a.profile}</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="acc-name" className="label-caps">
          {a.displayName}
        </label>
        <input
          id="acc-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="acc-email" className="label-caps">
          {a.email}
        </label>
        <input id="acc-email" value={email} disabled className={inputCls} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="acc-salary" className="label-caps">
            {a.salaryDay}
          </label>
          <select
            id="acc-salary"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className={`${inputCls} cursor-pointer md:text-sm`}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {a.dayOption(d)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="acc-tz" className="label-caps">
            {a.timezone}
          </label>
          <input
            id="acc-tz"
            value={a.timezoneValue}
            disabled
            className={`${inputCls} md:text-sm`}
          />
        </div>
      </div>
      <p className="m-0 -mt-2 text-xs text-muted-foreground">{a.salaryDayHint}</p>
      <div className="flex flex-wrap justify-between gap-2.5">
        <Button type="button" variant="danger" size="md" onClick={() => logout()}>
          {t.nav.signOut}
        </Button>
        <Button type="submit" size="md" disabled={!dirty || update.isPending}>
          {update.isPending ? t.common.saving : a.save}
        </Button>
      </div>
    </form>
  );
}

export function AccountTab({ email }: { email: string }) {
  const profile = useProfile();
  if (profile.isLoading) return <CardSkeleton className="min-h-[420px] max-w-[560px]" lines={6} />;
  if (!profile.data) {
    return (
      <div className="relative max-w-[560px] card">
        <ErrorState onRetry={() => profile.refetch()} />
      </div>
    );
  }
  return <AccountForm key={profile.data.id} profile={profile.data} email={email} />;
}
