"use client";

import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppearancePicker } from "@/components/common/appearance-picker";
import { FormAlert } from "@/components/common/field";
import { Chip } from "@/components/common/segmented";
import { CountdownCard } from "@/components/countdowns/countdown-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useDeleteCountdown, useSaveCountdown } from "@/hooks/use-countdowns";
import { PALETTE, tone } from "@/lib/colors";
import { APP_TZ, daysBetween, localDate } from "@/lib/dates";
import type { CountdownView, PaletteColor } from "@/lib/supabase/types";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

const REMIND = [0, 1, 3, 7];
const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-[15px] text-text outline-none placeholder:text-dim focus-visible:border-accent/60 [color-scheme:dark]";

/** Ngày tới của sự kiện (cùng quy tắc fn_next_occurrence) để xem trước. */
function nextOccurrence(date: string, repeat: boolean, today: string) {
  if (!date || !repeat || date >= today) return date;
  const [, m, d] = date.split("-").map(Number);
  const at = (y: number) => {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
  };
  const y = Number(today.slice(0, 4));
  return at(y) >= today ? at(y) : at(y + 1);
}

function CountdownForm({ editing }: { editing: CountdownView | null }) {
  const close = useUi((s) => s.closeCountdown);
  const save = useSaveCountdown();
  const remove = useDeleteCountdown();
  const today = localDate(new Date(), APP_TZ);
  const [s, setS] = useState({
    title: editing?.title ?? "",
    date: editing?.event_date ?? "",
    repeat: editing?.repeat_yearly ?? false,
    color: (editing?.color ?? "pink") as PaletteColor,
    icon: editing?.icon ?? "calendar",
    remind: editing?.remind_days ?? [0, 1, 3],
  });
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<typeof s>) => setS((prev) => ({ ...prev, ...p }));

  const next = nextOccurrence(s.date, s.repeat, today);
  const daysLeft = next ? daysBetween(today, next) : 0;

  const submit = async () => {
    if (!s.title.trim()) return setError(t.countdowns.dialog.errors.name);
    if (!s.date) return setError(t.countdowns.dialog.errors.date);
    setError(undefined);
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: {
          title: s.title.trim(),
          event_date: s.date,
          repeat_yearly: s.repeat,
          color: s.color,
          icon: s.icon,
          remind_days: [...s.remind].sort((a, b) => a - b),
          fund_id: editing?.fund_id ?? null,
        },
      });
      toast.success(t.countdowns.dialog.saved);
      close();
    } catch {
      setError(t.countdowns.dialog.errors.save);
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await remove.mutateAsync(editing.id);
      toast.success(t.countdowns.dialog.deleted);
      close();
    } catch {
      setError(t.countdowns.dialog.errors.save);
    }
  };

  const toggleRemind = (d: number) =>
    set({ remind: s.remind.includes(d) ? s.remind.filter((x) => x !== d) : [...s.remind, d] });

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
      className="flex flex-col gap-6 p-[22px] pt-[max(22px,env(safe-area-inset-top))] md:px-8 md:pt-7 md:pb-8"
    >
      <DialogHeader>
        <DialogTitle>
          {editing ? t.countdowns.dialog.editTitle : t.countdowns.dialog.addTitle}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-wrap gap-7">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-[18px]">
          <div className="flex items-end gap-3">
            <div className="flex min-w-0 grow flex-col gap-2">
              <label htmlFor="cd-name" className="label-caps">
                {t.countdowns.dialog.name}
              </label>
              <input
                id="cd-name"
                autoFocus={!editing}
                maxLength={80}
                value={s.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder={t.countdowns.dialog.namePlaceholder}
                className={inputCls}
              />
            </div>
            <AppearancePicker
              icon={s.icon}
              color={s.color}
              onChange={(v) => set(v)}
              label={t.countdowns.dialog.icon}
              iconLabel={t.countdowns.dialog.icon}
              colorLabel={t.countdowns.dialog.color}
              showColors={false}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="cd-date" className="label-caps">
              {t.countdowns.dialog.date}
            </label>
            <input
              id="cd-date"
              type="date"
              value={s.date}
              onChange={(e) => set({ date: e.target.value })}
              className={inputCls}
            />
          </div>
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-border bg-bg px-3.5">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{t.countdowns.dialog.repeat}</span>
              <span className="text-xs text-muted-foreground">
                {t.countdowns.dialog.repeatHint}
              </span>
            </span>
            <Switch
              checked={s.repeat}
              onCheckedChange={(v) => set({ repeat: v })}
              aria-label={t.countdowns.dialog.repeat}
            />
          </label>
          <div className="flex flex-col gap-2.5">
            <span className="label-caps" id="cd-color">
              {t.countdowns.dialog.color}
            </span>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-labelledby="cd-color">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={s.color === c}
                  aria-label={t.colors[c]}
                  onClick={() => set({ color: c })}
                  className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0"
                >
                  <span
                    className="flex size-9 items-center justify-center rounded-full outline-offset-[3px]"
                    style={{
                      background: tone(c).fg,
                      outline: s.color === c ? "2px solid var(--text)" : "none",
                    }}
                  >
                    {s.color === c && <Check className="size-4 text-bg" aria-hidden />}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="label-caps" id="cd-remind">
              {t.countdowns.dialog.remind}
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="cd-remind">
              {REMIND.map((d) => (
                <Chip
                  key={d}
                  active={s.remind.includes(d)}
                  onClick={() => toggleRemind(d)}
                  className="min-h-[38px] text-[13px]"
                >
                  {t.countdowns.dialog.remindOptions[d]}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5">
          <span className="label-caps">{t.countdowns.dialog.preview}</span>
          <CountdownCard
            className="grow rounded-[22px] border border-border bg-bg p-[22px]"
            title={s.title}
            date={next}
            daysLeft={daysLeft}
            repeat={s.repeat}
            icon={s.icon}
            color={s.color}
            isPast={Boolean(next) && daysLeft < 0}
            big
          />
        </div>
      </div>

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
            {confirmDelete ? t.countdowns.dialog.deleteConfirm : t.countdowns.dialog.delete}
          </Button>
        )}
        <Button type="button" variant="field" size="md" className="min-h-12 px-5" onClick={close}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="md" className="min-h-12 px-6" disabled={save.isPending}>
          {save.isPending ? t.common.saving : t.countdowns.dialog.save}
        </Button>
      </div>
    </form>
  );
}

export function CountdownDialog() {
  const open = useUi((s) => s.countdown.open);
  const editing = useUi((s) => s.countdown.editing);
  const close = useUi((s) => s.closeCountdown);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="lg">
        {open && <CountdownForm key={editing?.id ?? "new"} editing={editing} />}
      </DialogContent>
    </Dialog>
  );
}
