"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppearancePicker } from "@/components/common/appearance-picker";
import { FormAlert } from "@/components/common/field";
import { Chip } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useArchiveHabit, useDeleteHabit, useSaveHabit } from "@/hooks/use-habits";
import type { HabitView, PaletteColor } from "@/lib/supabase/types";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

const TARGETS = [7, 6, 5, 4, 3, 2, 1];
const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px]";

function HabitForm({ editing }: { editing: HabitView | null }) {
  const close = useUi((s) => s.closeHabit);
  const save = useSaveHabit();
  const archive = useArchiveHabit();
  const remove = useDeleteHabit();
  const d = t.habits.dialog;

  const [s, setS] = useState({
    name: editing?.name ?? "",
    icon: editing?.icon ?? "activity",
    color: (editing?.color ?? "green") as PaletteColor,
    target: editing?.target_per_week ?? 7,
    active: !editing?.archived_at,
  });
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<typeof s>) => setS((prev) => ({ ...prev, ...p }));

  const submit = async () => {
    if (!s.name.trim()) return setError(d.errors.name);
    setError(undefined);
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: { name: s.name.trim(), icon: s.icon, color: s.color, target_per_week: s.target },
      });
      if (editing && s.active === Boolean(editing.archived_at)) {
        await archive.mutateAsync({ id: editing.id, archived: !s.active });
      }
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

      <div className="flex items-end gap-3">
        <div className="flex min-w-0 grow flex-col gap-2">
          <label htmlFor="habit-name" className="label-caps">
            {d.name}
          </label>
          <input
            id="habit-name"
            autoFocus={!editing}
            maxLength={60}
            value={s.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={d.namePlaceholder}
            className={inputCls}
          />
        </div>
        <AppearancePicker
          icon={s.icon}
          color={s.color}
          onChange={(v) => set(v)}
          label={d.icon}
          iconLabel={d.icon}
          colorLabel={d.color}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="label-caps" id="habit-target">
          {d.target}
        </span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="habit-target">
          {TARGETS.map((n) => (
            <Chip
              key={n}
              role="radio"
              aria-checked={s.target === n}
              active={s.target === n}
              onClick={() => set({ target: n })}
              className="min-h-[38px] text-[13px]"
            >
              {d.targetOption(n)}
            </Chip>
          ))}
        </div>
        <span className="text-[11px] text-dim">{d.targetHint(s.target)}</span>
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

export function HabitDialog() {
  const open = useUi((s) => s.habit.open);
  const editing = useUi((s) => s.habit.editing);
  const close = useUi((s) => s.closeHabit);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="md">
        {open && <HabitForm key={editing?.id ?? "new"} editing={editing} />}
      </DialogContent>
    </Dialog>
  );
}
