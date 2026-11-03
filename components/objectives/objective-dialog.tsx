"use client";

import { Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AppearancePicker } from "@/components/common/appearance-picker";
import { FormAlert } from "@/components/common/field";
import { Chip } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeleteObjective, useSaveObjective } from "@/hooks/use-objectives";
import { addMonths, APP_TZ, localDate } from "@/lib/dates";
import type { ObjectiveView, PaletteColor } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

const PACES = [null, 1, 2, 3, 4, 5, 6, 7];
const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px] [color-scheme:dark]";

function ObjectiveForm({ editing }: { editing: ObjectiveView | null }) {
  const close = useUi((s) => s.closeObjective);
  const save = useSaveObjective();
  const remove = useDeleteObjective();
  const router = useRouter();
  const pathname = usePathname();
  const d = t.objectives.dialog;

  const [s, setS] = useState({
    title: editing?.title ?? "",
    why: editing?.why ?? "",
    icon: editing?.icon ?? "target",
    color: (editing?.color ?? "violet") as PaletteColor,
    start: editing?.start_on ?? localDate(new Date(), APP_TZ),
    end: editing?.end_on ?? "",
    pace: editing ? editing.sessions_per_week : (3 as number | null),
    outputs: "",
  });
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<typeof s>) => setS((prev) => ({ ...prev, ...p }));

  const endQuick: { key: keyof typeof d.endOptions; value: string }[] = s.start
    ? [
        { key: "none", value: "" },
        { key: "m1", value: addMonths(s.start, 1) },
        { key: "m3", value: addMonths(s.start, 3) },
        { key: "m6", value: addMonths(s.start, 6) },
      ]
    : [];

  const submit = async () => {
    if (!s.title.trim()) return setError(d.errors.name);
    if (!s.start) return setError(d.errors.start);
    if (s.end && s.end < s.start) return setError(d.errors.end);
    setError(undefined);
    try {
      const id = await save.mutateAsync({
        id: editing?.id,
        input: {
          title: s.title.trim(),
          why: s.why.trim() || null,
          icon: s.icon,
          color: s.color,
          start_on: s.start,
          end_on: s.end || null,
          sessions_per_week: s.pace,
        },
        outputs: s.outputs
          .split("\n")
          .map((line) => line.trim().slice(0, 120))
          .filter(Boolean)
          .map((title) => ({ title, due_on: null })),
      });
      toast.success(d.saved);
      close();
      if (!editing) router.push(`/objectives/${id}`);
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
      if (pathname.startsWith(`/objectives/${editing.id}`)) router.push("/objectives");
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
          <label htmlFor="objective-title" className="label-caps">
            {d.name}
          </label>
          <input
            id="objective-title"
            autoFocus={!editing}
            maxLength={80}
            value={s.title}
            onChange={(e) => set({ title: e.target.value })}
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="objective-start" className="label-caps">
            {d.start}
          </label>
          <input
            id="objective-start"
            type="date"
            value={s.start}
            onChange={(e) => set({ start: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="objective-end" className="label-caps">
            {d.end}
          </label>
          <input
            id="objective-end"
            type="date"
            value={s.end}
            min={s.start || undefined}
            onChange={(e) => set({ end: e.target.value })}
            className={inputCls}
          />
        </div>
        {endQuick.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:col-span-2" role="group" aria-label={d.end}>
            {endQuick.map((o) => (
              <Chip
                key={o.key}
                active={s.end === o.value}
                onClick={() => set({ end: o.value })}
                className="min-h-[38px] text-[13px]"
              >
                {d.endOptions[o.key]}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="label-caps" id="objective-pace">
          {d.pace}
        </span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="objective-pace">
          {PACES.map((n) => (
            <Chip
              key={n ?? "none"}
              role="radio"
              aria-checked={s.pace === n}
              active={s.pace === n}
              onClick={() => set({ pace: n })}
              className="min-h-[38px] text-[13px]"
            >
              {n === null ? d.paceNone : d.paceOption(n)}
            </Chip>
          ))}
        </div>
        <span className="text-[11px] text-dim">{d.paceHint(s.pace)}</span>
      </div>

      {!editing && (
        <div className="flex flex-col gap-2">
          <label htmlFor="objective-outputs" className="label-caps">
            {d.outputs}
          </label>
          <textarea
            id="objective-outputs"
            rows={3}
            value={s.outputs}
            onChange={(e) => set({ outputs: e.target.value })}
            placeholder={d.outputsPlaceholder}
            className={cn(inputCls, "resize-y py-3 leading-relaxed")}
          />
          <span className="text-[11px] text-dim">{d.outputsHint}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="objective-why" className="label-caps">
          {d.why}
        </label>
        <textarea
          id="objective-why"
          rows={2}
          maxLength={500}
          value={s.why}
          onChange={(e) => set({ why: e.target.value })}
          placeholder={d.whyPlaceholder}
          className={cn(inputCls, "resize-y py-3 leading-relaxed")}
        />
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

export function ObjectiveDialog() {
  const open = useUi((s) => s.objective.open);
  const editing = useUi((s) => s.objective.editing);
  const close = useUi((s) => s.closeObjective);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="md">
        {open && <ObjectiveForm key={editing?.id ?? "new"} editing={editing} />}
      </DialogContent>
    </Dialog>
  );
}
