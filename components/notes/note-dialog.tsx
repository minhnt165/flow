"use client";

import { Pin, PinOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeleteNote, useSaveNote } from "@/hooks/use-notes";
import { formatDateTime } from "@/lib/dates";
import type { Note } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

const inputCls =
  "w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px]";

function NoteForm({ editing }: { editing: Note | null }) {
  const close = useUi((s) => s.closeNote);
  const save = useSaveNote();
  const remove = useDeleteNote();
  const d = t.notes.dialog;

  const [s, setS] = useState({
    title: editing?.title ?? "",
    body: editing?.body ?? "",
    pinned: editing?.pinned ?? false,
  });
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<typeof s>) => setS((prev) => ({ ...prev, ...p }));

  const dirty =
    !editing || s.title !== editing.title || s.body !== editing.body || s.pinned !== editing.pinned;

  const submit = async () => {
    if (!s.title.trim() && !s.body.trim()) return setError(d.errors.empty);
    setError(undefined);
    if (!dirty) return close();
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: { title: s.title.trim(), body: s.body.replace(/\s+$/, ""), pinned: s.pinned },
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
      className="flex min-h-full flex-col gap-4 p-[22px] pt-[max(22px,env(safe-area-inset-top))] md:px-8 md:pt-7 md:pb-8"
    >
      <DialogHeader>
        <DialogTitle>{editing ? d.editTitle : d.addTitle}</DialogTitle>
      </DialogHeader>

      <input
        aria-label={d.name}
        autoFocus={!editing}
        maxLength={120}
        value={s.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder={d.namePlaceholder}
        className={cn(inputCls, "min-h-12 font-display text-lg font-bold tracking-[-0.2px]")}
      />
      <textarea
        aria-label={d.body}
        autoFocus={Boolean(editing)}
        rows={10}
        maxLength={20000}
        value={s.body}
        onChange={(e) => set({ body: e.target.value })}
        placeholder={d.bodyPlaceholder}
        className={cn(
          inputCls,
          "min-h-[240px] grow resize-y py-3 leading-relaxed md:min-h-[320px]",
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="field"
          size="sm"
          aria-pressed={s.pinned}
          onClick={() => set({ pinned: !s.pinned })}
        >
          {s.pinned ? (
            <PinOff className="size-4" aria-hidden />
          ) : (
            <Pin className="size-4" aria-hidden />
          )}
          {s.pinned ? d.unpin : d.pin}
        </Button>
        {editing && (
          <span className="text-[11px] text-dim">
            {t.notes.updatedAt(formatDateTime(editing.updated_at))}
          </span>
        )}
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

export function NoteDialog() {
  const open = useUi((s) => s.note.open);
  const editing = useUi((s) => s.note.editing);
  const close = useUi((s) => s.closeNote);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="lg">
        {open && <NoteForm key={editing?.id ?? "new"} editing={editing} />}
      </DialogContent>
    </Dialog>
  );
}
