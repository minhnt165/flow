"use client";

import { ArrowLeftRight, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
import { Chip, Segmented } from "@/components/common/segmented";
import { FundCardPicker, FundSelect } from "@/components/expenses/fund-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useLookups } from "@/hooks/use-lookups";
import { useProfile } from "@/hooks/use-profile";
import { useTransactionMutations } from "@/hooks/use-transactions";
import { tone } from "@/lib/colors";
import { APP_TZ, localDate, localTime, toIso } from "@/lib/dates";
import { formatAmountInput, formatVND, parseAmountInput, readVND } from "@/lib/money";
import type { Transaction, TransactionInput } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi, type TxMode } from "@/stores/ui";
import { nthSalaryDateAfter } from "@/supabase/functions/_shared/goal.ts";

const QUICK = [
  { key: "half", amount: 500_000, label: t.tx.quick.half },
  { key: "one", amount: 1_000_000, label: t.tx.quick.one },
  { key: "two", amount: 2_000_000, label: t.tx.quick.two },
] as const;

const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-sm text-text outline-none placeholder:text-dim focus-visible:border-accent/60 [color-scheme:dark]";

function initialState(
  editing: Transaction | null,
  mode: TxMode,
  preset: { fundId?: string; toFundId?: string; amount?: number } | null,
  defaultFundId?: string,
) {
  const at = editing ? new Date(editing.occurred_at) : new Date();
  return {
    mode,
    amount: editing?.amount ?? preset?.amount ?? 0,
    categoryId: editing?.category_id ?? null,
    note: editing?.note ?? "",
    day: localDate(at, APP_TZ),
    time: localTime(at, APP_TZ),
    fundId: editing?.fund_id ?? preset?.fundId ?? defaultFundId,
    toFundId: editing?.to_fund_id ?? preset?.toFundId,
    repeat: false,
  };
}

function TransactionForm() {
  const { tx, closeTx } = useUi();
  const { funds, categories, defaultFund, fundById } = useLookups();
  const profile = useProfile();
  const { create, update, remove, createRule } = useTransactionMutations();
  const editing = tx.editing;

  const [state, setS] = useState(() => {
    const init = initialState(editing, tx.mode, tx.preset, defaultFund?.id);
    if (init.mode === "transfer" && !init.toFundId) {
      init.toFundId = funds.find((f) => f.id !== init.fundId)?.id;
    }
    return init;
  });
  // Mở hộp thoại trước khi danh sách quỹ tải xong: quỹ mặc định / quỹ khác làm giá trị dự phòng.
  const fallbackFrom = defaultFund?.id ?? funds[0]?.id;
  const s = {
    ...state,
    fundId: state.fundId ?? fallbackFrom,
    toFundId: state.toFundId ?? funds.find((f) => f.id !== (state.fundId ?? fallbackFrom))?.id,
  };
  const [amountText, setAmountText] = useState(s.amount ? formatAmountInput(String(s.amount)) : "");
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (patch: Partial<typeof state>) => setS((prev) => ({ ...prev, ...patch }));
  const setAmount = (n: number) => {
    set({ amount: n });
    setAmountText(n ? formatAmountInput(String(n)) : "");
  };
  const isTransfer = s.mode === "transfer";
  const catType = s.mode === "income" ? "income" : "expense";
  const cats = categories.filter((c) => c.type === catType);
  const from = s.fundId ? fundById.get(s.fundId) : undefined;
  const to = s.toFundId ? fundById.get(s.toFundId) : undefined;
  const pending = create.isPending || update.isPending || remove.isPending;

  const switchMode = (mode: TxMode) => {
    const patch: Partial<typeof s> = { mode, categoryId: mode === s.mode ? s.categoryId : null };
    if (mode === "transfer" && (!s.toFundId || s.toFundId === s.fundId)) {
      patch.toFundId = funds.find((f) => f.id !== s.fundId)?.id;
    }
    set(patch);
    setError(undefined);
  };

  const submit = async (override?: Partial<typeof s>) => {
    const v = { ...s, ...override };
    if (v.amount <= 0) return setError(t.tx.errors.amount);
    if (!v.fundId) return setError(t.tx.errors.fund);
    if (v.mode === "transfer") {
      if (!v.toFundId) return setError(t.tx.errors.fund);
      if (v.toFundId === v.fundId) return setError(t.tx.errors.sameFund);
    } else if (!v.categoryId) {
      return setError(t.tx.errors.category);
    }
    const input: TransactionInput = {
      type: v.mode,
      amount: v.amount,
      fund_id: v.fundId,
      to_fund_id: v.mode === "transfer" ? (v.toFundId ?? null) : null,
      category_id: v.mode === "transfer" ? null : v.categoryId,
      note: v.note.trim() || null,
      occurred_at: toIso(v.day, v.time),
    };
    setError(undefined);
    // Đóng ngay, giao dịch hiện lạc quan trong danh sách; lỗi thì báo bằng toast.
    closeTx();
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input });
      else await create.mutateAsync(input);
      if (!editing && v.mode === "transfer" && v.repeat && v.toFundId) {
        const day = profile.data?.salary_day ?? Number(v.day.slice(8, 10));
        await createRule.mutateAsync({
          amount: v.amount,
          fund_id: v.fundId,
          to_fund_id: v.toFundId,
          day_of_month: day,
          next_run_on: nthSalaryDateAfter(localDate(new Date(), APP_TZ), day, 1),
          name: v.note.trim() || null,
        });
      }
      toast.success(t.tx.saved);
    } catch {
      toast.error(t.tx.errors.save);
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    closeTx();
    try {
      await remove.mutateAsync(editing.id);
      toast.success(t.tx.deleted);
    } catch {
      toast.error(t.tx.errors.save);
    }
  };

  const pickCategory = (id: string) => {
    // Thêm mới và đã có số tiền: chạm danh mục là lưu luôn (mở → gõ số → chọn danh mục).
    if (!editing && s.amount > 0) {
      set({ categoryId: id });
      void submit({ categoryId: id });
      return;
    }
    set({ categoryId: id });
  };

  const fromAfter = from ? from.balance - s.amount : 0;
  const toAfter = to ? to.balance + s.amount : 0;
  const toGoalPct = to?.target_amount ? Math.round((toAfter * 100) / to.target_amount) : null;

  return (
    <form
      ref={formRef}
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
      className="flex flex-col gap-6 p-[22px] pt-[max(22px,env(safe-area-inset-top))] md:px-8 md:pt-7 md:pb-8"
    >
      <DialogHeader className="flex-nowrap">
        <DialogTitle className="hidden md:block">
          {editing ? t.tx.editTitle : isTransfer ? t.tx.modes.transfer : t.tx.addTitle}
        </DialogTitle>
        <Segmented
          label={t.tx.modeLabel}
          value={s.mode}
          onChange={switchMode}
          options={(["expense", "income", "transfer"] as const).map((m) => ({
            value: m,
            label: t.tx.modes[m],
          }))}
          className="order-first min-w-0 md:order-none md:ml-auto [&>button]:px-3 md:[&>button]:px-4"
        />
      </DialogHeader>

      {isTransfer && (
        <div className="flex flex-wrap items-stretch gap-2.5">
          <FundCardPicker
            label={t.tx.transferFrom}
            funds={funds}
            value={s.fundId}
            onChange={(id) => set({ fundId: id })}
          />
          <button
            type="button"
            aria-label={t.tx.swap}
            onClick={() => set({ fundId: s.toFundId, toFundId: s.fundId })}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center self-center rounded-full border border-border bg-surface text-text hover:bg-surface-2"
          >
            <ArrowLeftRight className="size-[18px]" aria-hidden />
          </button>
          <FundCardPicker
            label={t.tx.transferTo}
            funds={funds}
            value={s.toFundId}
            onChange={(id) => set({ toFundId: id })}
            highlight
          />
        </div>
      )}

      <div className="flex flex-col gap-2 border-b border-surface-2 pb-2.5 max-md:items-center max-md:border-0">
        <label htmlFor="tx-amount" className="label-caps">
          {isTransfer ? t.tx.amountTransfer : t.tx.amount}
        </label>
        <div className="flex w-full items-baseline gap-2.5 max-md:justify-center">
          <input
            id="tx-amount"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="0"
            value={amountText}
            onChange={(e) => {
              const text = formatAmountInput(e.target.value);
              setAmountText(text);
              set({ amount: parseAmountInput(text) });
            }}
            className="w-full min-w-0 grow border-0 bg-transparent p-0 font-display text-[52px] leading-tight font-bold tracking-[-2.5px] text-text outline-none placeholder:text-dim max-md:max-w-[260px] max-md:text-right max-md:text-[56px]"
          />
          <span className="font-display text-[26px] font-bold text-accent">₫</span>
        </div>
        {isTransfer ? (
          <div className="flex flex-wrap gap-2 pb-3.5">
            {QUICK.map((q) => (
              <Chip key={q.key} active={s.amount === q.amount} onClick={() => setAmount(q.amount)}>
                {q.label}
              </Chip>
            ))}
            <Chip
              active={Boolean(from && from.balance > 0 && s.amount === from.balance)}
              onClick={() => from && setAmount(Math.max(0, from.balance))}
            >
              {t.tx.quick.all}
            </Chip>
          </div>
        ) : (
          <span className="pb-2.5 text-[13px] text-muted-foreground" aria-live="polite">
            {s.amount > 0 ? readVND(s.amount) : " "}
          </span>
        )}
      </div>

      {isTransfer ? (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex min-w-0 flex-col gap-1 rounded-[14px] border border-surface-2 bg-bg px-3.5 py-3">
            <span className="truncate text-[11px] text-muted-foreground">
              {t.tx.afterSend(from?.name ?? "—")}
            </span>
            <span
              className={cn("font-display text-base font-bold", fromAfter < 0 && "text-danger")}
            >
              {formatVND(fromAfter)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1 rounded-[14px] border border-surface-2 bg-bg px-3.5 py-3">
            <span className="truncate text-[11px] text-muted-foreground">
              {t.tx.afterReceive(to?.name ?? "—")}
            </span>
            <span
              className="font-display text-base font-bold"
              style={{ color: to ? tone(to.color).fg : undefined }}
            >
              {formatVND(toAfter)}
              {toGoalPct !== null && ` · ${t.tx.ofGoal(toGoalPct)}`}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label-caps">{t.tx.category}</span>
            {!editing && s.amount > 0 && (
              <span className="text-[11px] text-dim">{t.tx.quickSaveHint}</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(min(120px,100%),1fr))]">
            {cats.map((c) => {
              const active = s.categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickCategory(c.id)}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border-[1.5px] px-1 pt-3 pb-2.5 text-[11px] transition-colors md:min-h-12 md:flex-row md:gap-2.5 md:rounded-[14px] md:bg-bg md:px-3 md:py-0 md:text-left md:text-[13px]",
                    "bg-surface",
                    active
                      ? "border-accent font-semibold text-text"
                      : "border-surface-2 font-medium text-muted-foreground hover:text-text md:border-border md:text-soft",
                  )}
                >
                  <IconTile icon={c.icon} color={c.color} size={34} />
                  <span className="max-w-full truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="tx-note" className="label-caps">
            {t.tx.note}
          </label>
          <input
            id="tx-note"
            value={s.note}
            maxLength={200}
            onChange={(e) => set({ note: e.target.value })}
            placeholder={isTransfer ? t.tx.notePlaceholderTransfer : t.tx.notePlaceholder}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="label-caps" id="tx-time-label">
            {t.tx.time}
          </span>
          <div className="flex gap-2" role="group" aria-labelledby="tx-time-label">
            <input
              type="date"
              aria-label={t.tx.date}
              value={s.day}
              onChange={(e) => e.target.value && set({ day: e.target.value })}
              className={cn(inputCls, "flex-[1_1_110px]")}
            />
            <input
              type="time"
              aria-label={t.tx.hour}
              value={s.time}
              onChange={(e) => e.target.value && set({ time: e.target.value })}
              className={cn(inputCls, "flex-[0_1_128px] px-2 text-center font-display font-medium")}
            />
          </div>
        </div>
        {isTransfer ? (
          !editing && (
            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 self-end rounded-[14px] border border-border bg-bg px-3.5">
              <span className="text-[13px] font-medium">{t.tx.repeat}</span>
              <Switch
                checked={s.repeat}
                onCheckedChange={(v) => set({ repeat: v })}
                aria-label={t.tx.repeat}
              />
            </label>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="tx-fund" className="label-caps">
              {s.mode === "income" ? t.tx.toFund : t.tx.fromFund}
            </label>
            <FundSelect
              id="tx-fund"
              funds={funds}
              value={s.fundId}
              onChange={(id) => set({ fundId: id })}
            />
          </div>
        )}
      </div>

      <FormAlert error={error} />

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1 max-md:sticky max-md:bottom-0 max-md:-mx-[22px] max-md:-mb-[22px] max-md:border-t max-md:border-surface-2 max-md:bg-surface max-md:px-[22px] max-md:py-3 max-md:pb-[max(12px,env(safe-area-inset-bottom))]">
        {editing && (
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={onDelete}
            disabled={pending}
            className="mr-auto"
          >
            <Trash2 aria-hidden />
            {confirmDelete ? t.tx.deleteConfirm : t.tx.delete}
          </Button>
        )}
        <span className="mr-auto hidden text-[11px] text-dim md:inline">
          {!editing && t.tx.shortcutHint}
        </span>
        <Button type="button" variant="field" size="md" className="min-h-12 px-5" onClick={closeTx}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="md" className="min-h-12 px-6" disabled={pending}>
          {isTransfer && s.amount > 0 && !editing
            ? t.tx.saveTransfer(formatVND(s.amount))
            : t.tx.save}
        </Button>
      </div>
    </form>
  );
}

export function TransactionDialog() {
  const open = useUi((s) => s.tx.open);
  const seq = useUi((s) => s.tx.seq);
  const closeTx = useUi((s) => s.closeTx);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeTx()}>
      <DialogContent className="md:max-w-[640px]">
        <TransactionForm key={seq} />
      </DialogContent>
    </Dialog>
  );
}
