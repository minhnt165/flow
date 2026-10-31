"use client";

import { CalendarClock, CircleCheck, Star, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/common/amount-input";
import { AppearancePicker } from "@/components/common/appearance-picker";
import { FormAlert } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useCountdowns } from "@/hooks/use-countdowns";
import { useFunds, useRemoveFund, useSaveFund, useSetDefaultFund } from "@/hooks/use-funds";
import { useSalaryContext } from "@/hooks/use-salary";
import { tone } from "@/lib/colors";
import { APP_TZ, formatDate, localDate } from "@/lib/dates";
import { formatMillions, formatVND } from "@/lib/money";
import type { Fund, FundInput, FundKind, PaletteColor } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi, type FundPreset } from "@/stores/ui";
import { planGoal } from "@/supabase/functions/_shared/goal.ts";

const KINDS: FundKind[] = ["monthly_budget", "goal", "free"];
const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px] [color-scheme:dark]";

type FormState = {
  name: string;
  icon: string;
  color: PaletteColor;
  kind: FundKind;
  monthlyBudget: number;
  target: number;
  deadline: string;
  countdownId: string | null;
  useCountdown: boolean;
  auto: boolean;
  autoAmount: number;
  opening: number;
};

function initial(f: Fund | null, preset: FundPreset | null): FormState {
  return {
    name: f?.name ?? preset?.name ?? "",
    icon: f?.icon ?? preset?.icon ?? "piggy-bank",
    color: (f?.color as PaletteColor) ?? preset?.color ?? "sky",
    kind: f?.kind ?? "goal",
    monthlyBudget: f?.monthly_budget ?? 0,
    target: f?.target_amount ?? 0,
    deadline: f?.target_date ?? "",
    countdownId: f?.countdown_id ?? preset?.countdownId ?? null,
    useCountdown: Boolean((f?.countdown_id && !f?.target_date) || preset?.countdownId),
    auto: Boolean(f?.auto_contribution),
    autoAmount: f?.auto_contribution ?? 0,
    opening: f?.opening_balance ?? 0,
  };
}

function PlanRow({ label, value, tone: color }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-2.5">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className="shrink-0 font-display font-bold whitespace-nowrap" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function FundForm() {
  const editing = useUi((s) => s.fund.editing);
  const preset = useUi((s) => s.fund.preset);
  const closeFund = useUi((s) => s.closeFund);
  const save = useSaveFund();
  const remove = useRemoveFund();
  const makeDefault = useSetDefaultFund();
  const funds = useFunds();
  const countdowns = useCountdowns();
  const ctx = useSalaryContext(editing?.id);
  const [s, setS] = useState<FormState>(() => initial(editing, preset));
  const [error, setError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const set = (p: Partial<FormState>) => setS((prev) => ({ ...prev, ...p }));

  const today = localDate(new Date(), APP_TZ);
  const isDefault = Boolean(editing?.is_default);
  const balance = funds.data?.find((f) => f.id === editing?.id)?.balance ?? 0;
  const linkedCountdown = (countdowns.data ?? []).find((c) => c.id === s.countdownId);
  const deadline = s.useCountdown ? (linkedCountdown?.next_occurrence ?? null) : s.deadline || null;
  const sourceFund = ctx.defaultFund?.id === editing?.id ? undefined : ctx.defaultFund;

  // Số dư từ view đã gồm opening_balance cũ; thay bằng giá trị đang nhập để xem trước.
  const liveBalance = balance - (editing?.opening_balance ?? 0) + s.opening;

  const plan = planGoal({
    target: s.target,
    contributed: liveBalance,
    deadline,
    today,
    salaryDay: ctx.salaryDay,
    contribution: s.auto ? s.autoAmount : 0,
    salary: ctx.salary,
    otherCommitments: ctx.commitments,
  });

  const submit = async () => {
    if (!s.name.trim()) return setError(t.fundDialog.errors.name);
    if (s.kind === "goal" && s.target <= 0) return setError(t.fundDialog.errors.target);
    if (s.kind === "goal" && !s.useCountdown && s.deadline && s.deadline <= today) {
      return setError(t.fundDialog.errors.deadlinePast);
    }
    const goal = s.kind === "goal";
    const auto = goal && s.auto && s.autoAmount > 0 && sourceFund;
    const input: FundInput = {
      name: s.name.trim(),
      icon: s.icon,
      color: s.color,
      kind: s.kind,
      monthly_budget: s.kind === "monthly_budget" && s.monthlyBudget > 0 ? s.monthlyBudget : null,
      target_amount: goal ? s.target : null,
      target_date: goal && !s.useCountdown && s.deadline ? s.deadline : null,
      countdown_id:
        goal && s.useCountdown ? s.countdownId : goal ? (editing?.countdown_id ?? null) : null,
      auto_contribution: auto ? s.autoAmount : null,
      auto_from_fund_id: auto ? sourceFund.id : null,
      opening_balance: s.opening,
    };
    setError(undefined);
    try {
      await save.mutateAsync({ id: editing?.id, input });
      toast.success(t.fundDialog.saved);
      closeFund();
    } catch {
      setError(t.fundDialog.errors.save);
    }
  };

  const onRemove = async () => {
    if (!editing) return;
    if (!confirmRemove) return setConfirmRemove(true);
    try {
      const result = await remove.mutateAsync(editing.id);
      toast.success(result === "deleted" ? t.fundDialog.deleted : t.fundDialog.archived);
      closeFund();
    } catch {
      setError(t.fundDialog.errors.save);
    }
  };

  const onMakeDefault = async () => {
    if (!editing) return;
    try {
      await makeDefault.mutateAsync(editing.id);
      toast.success(t.fundDialog.madeDefault);
      closeFund();
    } catch {
      setError(t.fundDialog.errors.save);
    }
  };

  const autoOk = plan.perPeriod !== null && s.autoAmount >= plan.perPeriod && s.autoAmount > 0;
  const planBig =
    s.kind === "goal"
      ? formatVND(plan.effectiveContribution)
      : s.kind === "monthly_budget"
        ? formatVND(s.monthlyBudget)
        : formatVND(liveBalance);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void submit();
        }
      }}
      className="flex flex-col gap-[22px] p-[22px] pt-[max(22px,env(safe-area-inset-top))] md:px-8 md:pt-7 md:pb-8"
    >
      <DialogHeader>
        <DialogTitle>{editing ? t.fundDialog.editTitle : t.fundDialog.createTitle}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-wrap gap-7">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px]">
          <div className="flex items-end gap-3">
            <div className="flex min-w-0 grow flex-col gap-2">
              <label htmlFor="f-name" className="label-caps">
                {t.fundDialog.name}
              </label>
              <input
                id="f-name"
                autoFocus={!editing}
                maxLength={60}
                value={s.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={t.fundDialog.namePlaceholder}
                className={inputCls}
              />
            </div>
            <AppearancePicker
              icon={s.icon}
              color={s.color}
              onChange={(v) => set(v)}
              label={t.fundDialog.iconColor}
              iconLabel={t.fundDialog.icon}
              colorLabel={t.fundDialog.color}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="f-opening" className="label-caps">
              {editing ? t.fundDialog.openingEdit : t.fundDialog.opening}
            </label>
            <AmountInput id="f-opening" value={s.opening} onChange={(v) => set({ opening: v })} />
            <span className="text-xs text-muted-foreground">{t.fundDialog.openingHint}</span>
          </div>

          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="mb-2.5 label-caps">{t.fundDialog.kind}</legend>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => {
                const active = s.kind === k;
                const disabled = isDefault && k !== editing?.kind;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => set({ kind: k })}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-1 rounded-[14px] border-[1.5px] bg-bg p-3 text-left disabled:cursor-not-allowed disabled:opacity-40",
                      active ? "border-accent text-text" : "border-border text-soft",
                    )}
                  >
                    <span className="text-[13px] font-semibold">{t.fundDialog.kinds[k].label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {t.fundDialog.kinds[k].hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {s.kind === "monthly_budget" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="f-budget" className="label-caps">
                {t.fundDialog.monthlyBudget}
              </label>
              <AmountInput
                id="f-budget"
                value={s.monthlyBudget}
                onChange={(v) => set({ monthlyBudget: v })}
              />
            </div>
          )}

          {s.kind === "goal" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="f-target" className="label-caps">
                    {t.fundDialog.target}
                  </label>
                  <AmountInput
                    id="f-target"
                    value={s.target}
                    onChange={(v) => set({ target: v })}
                  />
                </div>
                {s.useCountdown ? (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="f-countdown" className="label-caps">
                      {t.fundDialog.countdownLabel}
                    </label>
                    <select
                      id="f-countdown"
                      value={s.countdownId ?? ""}
                      onChange={(e) => set({ countdownId: e.target.value || null })}
                      className={cn(inputCls, "cursor-pointer md:text-sm")}
                    >
                      <option value="">
                        {(countdowns.data ?? []).length ? "—" : t.fundDialog.noCountdowns}
                      </option>
                      {(countdowns.data ?? [])
                        .filter((c) => !c.is_past)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} · {formatDate(c.next_occurrence)}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="f-deadline" className="label-caps">
                      {t.fundDialog.deadline}
                    </label>
                    <input
                      id="f-deadline"
                      type="date"
                      min={today}
                      value={s.deadline}
                      onChange={(e) => set({ deadline: e.target.value })}
                      className={cn(inputCls, "md:text-sm")}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => set({ useCountdown: !s.useCountdown })}
                className="flex min-h-9 cursor-pointer items-center gap-2 self-start rounded-full border-0 bg-transparent px-3 text-[13px] font-medium text-accent hover:bg-surface-2"
              >
                <CalendarClock className="size-4" aria-hidden />
                {s.useCountdown ? t.fundDialog.useDate : t.fundDialog.pickCountdown}
              </button>

              {sourceFund && (
                <div className="flex flex-col gap-3 rounded-2xl border border-surface-2 bg-bg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <label htmlFor="f-auto" className="text-sm font-medium">
                        {t.fundDialog.auto}
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {t.fundDialog.autoHint(sourceFund.name)}
                      </span>
                    </div>
                    <Switch
                      id="f-auto"
                      checked={s.auto}
                      onCheckedChange={(v) =>
                        set({
                          auto: v,
                          autoAmount: v && !s.autoAmount ? (plan.perPeriod ?? 0) : s.autoAmount,
                        })
                      }
                      aria-label={t.fundDialog.auto}
                    />
                  </div>
                  {s.auto && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <AmountInput
                        value={s.autoAmount}
                        onChange={(v) => set({ autoAmount: v })}
                        suffix={t.fundDialog.perPeriodSuffix}
                        aria-label={t.fundDialog.autoAmount}
                        className="min-h-[42px] flex-[1_1_140px] rounded-xl bg-surface"
                        inputClassName="md:text-[15px]"
                      />
                      {plan.perPeriod !== null && (
                        <span
                          className={cn(
                            "flex items-center gap-1.5 text-xs",
                            autoOk ? "text-cat-green" : "text-cat-orange",
                          )}
                        >
                          {autoOk ? (
                            <CircleCheck className="size-3.5" aria-hidden />
                          ) : (
                            <TriangleAlert className="size-3.5" aria-hidden />
                          )}
                          {autoOk
                            ? t.fundDialog.enough(plan.periodsToReach ?? plan.periods)
                            : t.fundDialog.notEnough(formatVND(plan.perPeriod))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5">
          <span className="label-caps">{t.fundDialog.plan}</span>
          <div className="flex grow flex-col gap-[18px] rounded-[22px] border border-border bg-bg p-[22px]">
            <div className="flex items-center gap-3">
              <IconTile icon={s.icon} color={s.color} size={44} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold">
                  {s.name.trim() || t.fundDialog.namePlaceholder}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.kind === "goal"
                    ? t.fundDialog.planSubtitleGoal(deadline ? formatDate(deadline) : null)
                    : s.kind === "monthly_budget"
                      ? t.fundDialog.planSubtitleBudget
                      : t.fundDialog.planSubtitleFree}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">
                {s.kind === "goal"
                  ? t.fundDialog.perPeriod
                  : s.kind === "monthly_budget"
                    ? t.fundDialog.monthlyBudget
                    : t.expenses.columns.amount}
              </span>
              <span
                className="font-display text-[34px] leading-none font-bold tracking-[-1.5px]"
                style={{ color: tone(s.color).fg }}
              >
                {planBig}
              </span>
            </div>
            {s.kind === "goal" && (
              <div className="flex flex-col gap-2.5 border-t border-surface-2 pt-3.5 text-[13px]">
                <PlanRow
                  label={t.fundDialog.periodsLeft}
                  value={deadline ? String(plan.periods) : "—"}
                />
                <PlanRow
                  label={
                    ctx.salary
                      ? t.fundDialog.salaryShare(formatMillions(ctx.salary))
                      : t.fundDialog.salaryUnknown
                  }
                  value={plan.pctOfSalary !== null ? `${plan.pctOfSalary}%` : "—"}
                />
                {sourceFund && (
                  <PlanRow
                    label={t.fundDialog.livingLeft(sourceFund.name)}
                    value={
                      plan.leftAfterCommitments !== null
                        ? formatVND(plan.leftAfterCommitments)
                        : "—"
                    }
                  />
                )}
                <PlanRow
                  label={t.fundDialog.reachDate}
                  value={plan.reachDate ? formatDate(plan.reachDate) : "—"}
                  tone={
                    plan.onTime === false
                      ? "var(--cat-orange)"
                      : plan.onTime
                        ? "var(--cat-green)"
                        : undefined
                  }
                />
              </div>
            )}
            <span className="mt-auto text-xs leading-normal text-muted-foreground">
              {s.kind === "goal"
                ? s.auto && !s.useCountdown && !editing?.countdown_id
                  ? t.fundDialog.countdownNote(s.name.trim() || t.fundDialog.namePlaceholder)
                  : null
                : s.kind === "monthly_budget"
                  ? t.fundDialog.budgetNote
                  : t.fundDialog.freeNote}
            </span>
          </div>
        </div>
      </div>

      <FormAlert error={error} />

      <div className="flex flex-wrap justify-end gap-2.5 pt-1 max-md:sticky max-md:bottom-0 max-md:-mx-[22px] max-md:-mb-[22px] max-md:border-t max-md:border-surface-2 max-md:bg-surface max-md:px-[22px] max-md:py-3 max-md:pb-[max(12px,env(safe-area-inset-bottom))]">
        {editing && !isDefault && (
          <div className="mr-auto flex flex-wrap gap-2.5">
            <Button
              type="button"
              variant="danger"
              size="md"
              className="min-h-12"
              disabled={remove.isPending}
              onClick={onRemove}
            >
              <Trash2 aria-hidden />
              {confirmRemove ? t.fundDialog.removeConfirm : t.fundDialog.remove}
            </Button>
            {editing.kind !== "goal" && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="min-h-12"
                disabled={makeDefault.isPending}
                onClick={onMakeDefault}
              >
                <Star aria-hidden />
                {t.fundDialog.makeDefault}
              </Button>
            )}
          </div>
        )}
        {editing && isDefault && (
          <span className="mr-auto max-w-sm self-center text-xs text-muted-foreground">
            {t.fundDialog.defaultHint}
          </span>
        )}
        <Button
          type="button"
          variant="field"
          size="md"
          className="min-h-12 px-5"
          onClick={closeFund}
        >
          {t.common.cancel}
        </Button>
        <Button type="submit" size="md" className="min-h-12 px-6" disabled={save.isPending}>
          {save.isPending ? t.common.saving : editing ? t.fundDialog.save : t.fundDialog.create}
        </Button>
      </div>
    </form>
  );
}

export function FundDialog() {
  const open = useUi((s) => s.fund.open);
  const editing = useUi((s) => s.fund.editing);
  const closeFund = useUi((s) => s.closeFund);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeFund()}>
      <DialogContent size="lg">{open && <FundForm key={editing?.id ?? "new"} />}</DialogContent>
    </Dialog>
  );
}
