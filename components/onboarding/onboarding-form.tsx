"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type OnboardingState } from "@/app/onboarding/actions";
import { AmountInput } from "@/components/common/amount-input";
import { FormAlert } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );
  const [day, setDay] = useState<number | null>(null);
  const [budget, setBudget] = useState(0);

  return (
    <form action={action} className="flex flex-col gap-7">
      <input type="hidden" name="salaryDay" value={day ?? ""} />
      <input type="hidden" name="budget" value={budget} />

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="label-caps mb-3">{t.onboarding.salaryDay}</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={day === d}
              aria-label={t.onboarding.dayLabel(d)}
              onClick={() => setDay(d)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border font-display text-[15px] font-bold transition-colors",
                day === d
                  ? "border-text bg-text text-bg"
                  : "border-border bg-surface text-text hover:bg-surface-2",
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="m-0 text-xs leading-relaxed text-muted-foreground">
          {t.onboarding.salaryDayHint}
        </p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="budget" className="label-caps">
          {t.onboarding.budget}
        </label>
        <AmountInput id="budget" value={budget} onChange={setBudget} className="bg-surface" />
        <p className="m-0 text-xs text-muted-foreground">{t.onboarding.budgetHint}</p>
      </div>

      <FormAlert error={state.error} />
      <Button
        type="submit"
        size="form"
        disabled={pending || day === null}
        className="w-full shadow-accent-strong"
      >
        {pending ? t.common.saving : t.onboarding.submit}
      </Button>
    </form>
  );
}
