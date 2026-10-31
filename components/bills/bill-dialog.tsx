"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/common/amount-input";
import { FormAlert } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
import { Chip } from "@/components/common/segmented";
import { FundSelect } from "@/components/expenses/fund-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useDeleteBill, useSaveBill } from "@/hooks/use-bills";
import { useLookups } from "@/hooks/use-lookups";
import { APP_TZ, formatLongDate, localDate } from "@/lib/dates";
import type { BillView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";
import { dueDateOnOrAfter } from "@/supabase/functions/_shared/goal.ts";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const INTERVALS = [1, 2, 3, 6, 12];
const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px] [color-scheme:dark]";

function BillForm({ editing }: { editing: BillView | null }) {
  const close = useUi((s) => s.closeBill);
  const save = useSaveBill();
  const remove = useDeleteBill();
  const { funds, categories, defaultFund } = useLookups();
  const expenseCats = categories.filter((c) => c.type === "expense");
  const today = localDate(new Date(), APP_TZ);
  const d = t.bills.dialog;

  const [s, setS] = useState({
    name: editing?.name ?? "",
    amount: editing?.amount ?? 0,
    day: editing?.day_of_month ?? Number(today.slice(8, 10)),
    interval: editing?.interval_months ?? 1,
    categoryId: editing?.category_id ?? null,
    fundId: editing?.fund_id ?? "",
    active: editing?.active ?? true,
  });
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<typeof s>) => setS((prev) => ({ ...prev, ...p }));

  // Mặc định lấy từ lookups lúc render (có thể tải xong sau khi form đã mở): danh mục "Hoá đơn", quỹ mặc định.
  const categoryId =
    s.categoryId ?? (expenseCats.find((c) => c.name === "Hoá đơn") ?? expenseCats[0])?.id ?? null;
  const fundId = s.fundId || defaultFund?.id || funds[0]?.id || "";

  // Giữ hạn hiện tại khi sửa mà không đổi ngày; đổi ngày thì tính lại từ hôm nay.
  const nextDue =
    editing && s.day === editing.day_of_month
      ? editing.next_run_on
      : dueDateOnOrAfter(today, s.day);

  const submit = async () => {
    if (!s.name.trim()) return setError(d.errors.name);
    if (s.amount <= 0) return setError(d.errors.amount);
    if (!fundId) return setError(d.errors.fund);
    setError(undefined);
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: {
          name: s.name.trim(),
          amount: s.amount,
          day_of_month: s.day,
          interval_months: s.interval,
          category_id: categoryId,
          fund_id: fundId,
          next_run_on: nextDue,
          active: s.active,
        },
      });
      toast.success(d.saved);
      close();
    } catch {
      setError(d.errors.save);
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await remove.mutateAsync(editing.id);
      toast.success(d.deleted);
      close();
    } catch {
      setError(d.errors.save);
    }
  };

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
      className="flex flex-col gap-5 p-[22px] pt-[max(22px,env(safe-area-inset-top))] md:px-8 md:pt-7 md:pb-8"
    >
      <DialogHeader>
        <DialogTitle>{editing ? d.editTitle : d.addTitle}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <label htmlFor="bill-name" className="label-caps">
          {d.name}
        </label>
        <input
          id="bill-name"
          autoFocus={!editing}
          maxLength={80}
          value={s.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={d.namePlaceholder}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="bill-amount" className="label-caps">
            {d.amount}
          </label>
          <AmountInput
            id="bill-amount"
            value={s.amount}
            onChange={(v) => set({ amount: v })}
            inputClassName="text-lg"
          />
          <span className="text-[11px] text-dim">{d.amountHint}</span>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="bill-day" className="label-caps">
            {d.day}
          </label>
          <select
            id="bill-day"
            value={s.day}
            onChange={(e) => set({ day: Number(e.target.value) })}
            className={cn(inputCls, "cursor-pointer md:text-sm")}
          >
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {d.dayOption(day)}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-dim">{d.nextDue(formatLongDate(nextDue))}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="label-caps" id="bill-interval">
          {d.interval}
        </span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="bill-interval">
          {INTERVALS.map((m) => (
            <Chip
              key={m}
              role="radio"
              aria-checked={s.interval === m}
              active={s.interval === m}
              onClick={() => set({ interval: m })}
              className="min-h-[38px] text-[13px]"
            >
              {d.intervalOptions[m]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="label-caps" id="bill-cat">
          {d.category}
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="bill-cat">
          {expenseCats.map((c) => (
            <Chip
              key={c.id}
              active={categoryId === c.id}
              onClick={() => set({ categoryId: c.id })}
              className="min-h-[38px] pl-2 text-[13px]"
            >
              <IconTile icon={c.icon} color={c.color} size={22} />
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="bill-fund" className="label-caps">
          {d.fund}
        </label>
        <FundSelect
          id="bill-fund"
          funds={funds.filter((f) => !f.archived_at)}
          value={fundId}
          onChange={(id) => set({ fundId: id })}
        />
      </div>

      {editing && (
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-border bg-bg px-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{d.active}</span>
            <span className="text-xs text-muted-foreground">{d.activeHint}</span>
          </span>
          <Switch
            checked={s.active}
            onCheckedChange={(v) => set({ active: v })}
            aria-label={d.active}
          />
        </label>
      )}

      <FormAlert error={error} />

      <div className="flex flex-wrap justify-end gap-2.5 pt-1 max-md:sticky max-md:bottom-0 max-md:-mx-[22px] max-md:-mb-[22px] max-md:border-t max-md:border-surface-2 max-md:bg-surface max-md:px-[22px] max-md:py-3 max-md:pb-[max(12px,env(safe-area-inset-bottom))]">
        {editing && (
          <Button
            type="button"
            variant="danger"
            size="md"
            className="mr-auto min-h-12"
            onClick={onDelete}
          >
            <Trash2 aria-hidden />
            {confirmDelete ? d.deleteConfirm : d.delete}
          </Button>
        )}
        <Button type="button" variant="field" size="md" className="min-h-12 px-5" onClick={close}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="md" className="min-h-12 px-6" disabled={save.isPending}>
          {save.isPending ? t.common.saving : editing ? d.save : d.create}
        </Button>
      </div>
    </form>
  );
}

export function BillDialog() {
  const open = useUi((s) => s.bill.open);
  const editing = useUi((s) => s.bill.editing);
  const close = useUi((s) => s.closeBill);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="md">
        {open && <BillForm key={editing?.id ?? "new"} editing={editing} />}
      </DialogContent>
    </Dialog>
  );
}
