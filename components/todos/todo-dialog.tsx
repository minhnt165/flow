"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/common/field";
import { Chip } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useDeleteTodo, useSaveTodo, useToggleTodo } from "@/hooks/use-todos";
import { addDays, APP_TZ, localDate } from "@/lib/dates";
import type { TodoView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px] [color-scheme:dark]";

function TodoForm({ editing }: { editing: TodoView | null }) {
  const close = useUi((s) => s.closeTodo);
  const save = useSaveTodo();
  const remove = useDeleteTodo();
  const toggle = useToggleTodo();
  const today = localDate(new Date(), APP_TZ);
  const d = t.todos.dialog;

  const [s, setS] = useState({
    title: editing?.title ?? "",
    note: editing?.note ?? "",
    due: editing?.due_on ?? "",
    done: editing?.done ?? false,
  });
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<typeof s>) => setS((prev) => ({ ...prev, ...p }));

  const quick: { key: keyof typeof d.dueOptions; value: string }[] = [
    { key: "none", value: "" },
    { key: "today", value: today },
    { key: "tomorrow", value: addDays(today, 1) },
    { key: "week", value: addDays(today, 7) },
  ];

  const submit = async () => {
    if (!s.title.trim()) return setError(d.errors.name);
    setError(undefined);
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: { title: s.title.trim(), note: s.note.trim() || null, due_on: s.due || null },
      });
      if (editing && s.done !== editing.done) {
        await toggle.mutateAsync({ id: editing.id, done: s.done });
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

      <div className="flex flex-col gap-2">
        <label htmlFor="todo-title" className="label-caps">
          {d.name}
        </label>
        <input
          id="todo-title"
          autoFocus={!editing}
          maxLength={120}
          value={s.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={d.namePlaceholder}
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <label htmlFor="todo-due" className="label-caps">
          {d.due}
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={d.due}>
          {quick.map((o) => (
            <Chip
              key={o.key}
              active={s.due === o.value}
              onClick={() => set({ due: o.value })}
              className="min-h-[38px] text-[13px]"
            >
              {d.dueOptions[o.key]}
            </Chip>
          ))}
        </div>
        <input
          id="todo-due"
          type="date"
          value={s.due}
          onChange={(e) => set({ due: e.target.value })}
          className={cn(inputCls, "sm:max-w-[240px]")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="todo-note" className="label-caps">
          {d.note}
        </label>
        <textarea
          id="todo-note"
          rows={3}
          maxLength={1000}
          value={s.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder={d.notePlaceholder}
          className={cn(inputCls, "resize-y py-3 leading-relaxed")}
        />
      </div>

      {editing && (
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-border bg-bg px-3.5">
          <span className="text-sm font-medium">{d.done}</span>
          <Switch checked={s.done} onCheckedChange={(v) => set({ done: v })} aria-label={d.done} />
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

export function TodoDialog() {
  const open = useUi((s) => s.todo.open);
  const editing = useUi((s) => s.todo.editing);
  const close = useUi((s) => s.closeTodo);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="md">
        {open && <TodoForm key={editing?.id ?? "new"} editing={editing} />}
      </DialogContent>
    </Dialog>
  );
}
