"use client";

import { FileText, Pin, Plus, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { useNotes } from "@/hooks/use-notes";
import { formatRelativeTime } from "@/lib/dates";
import type { Note } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

/** Tiêu đề hiển thị: tiêu đề, không có thì dòng đầu của nội dung. */
export function noteHeading(n: Note) {
  return n.title.trim() || n.body.trim().split("\n")[0] || t.notes.untitled;
}

/** Bỏ dấu để tìm "bo" ra "bố"; so khớp cả tiêu đề lẫn nội dung. */
function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function NoteCard({ note }: { note: Note }) {
  const openNote = useUi((s) => s.openNote);
  const heading = noteHeading(note);
  const preview = note.title.trim()
    ? note.body.trim()
    : note.body.trim().split("\n").slice(1).join("\n");
  return (
    <button
      type="button"
      onClick={() => openNote(note)}
      aria-label={heading}
      className="flex min-h-[132px] cursor-pointer flex-col gap-2 card rounded-[22px] p-5 text-left text-text transition-colors hover:border-border-strong"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 font-display text-[17px] leading-snug font-bold tracking-[-0.2px]">
          {heading}
        </span>
        {note.pinned && (
          <Pin className="mt-0.5 size-4 shrink-0 text-accent" aria-label={t.notes.pinned} />
        )}
      </span>
      {preview && (
        <span className="line-clamp-4 text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground">
          {preview}
        </span>
      )}
      <span className="mt-auto pt-1 text-[11px] text-dim">
        {t.notes.updatedAt(formatRelativeTime(note.updated_at))}
      </span>
    </button>
  );
}

export function NotesView() {
  const q = useNotes();
  const openNote = useUi((s) => s.openNote);
  const [query, setQuery] = useState("");
  const needle = fold(useDeferredValue(query).trim());

  const all = q.data ?? [];
  const list = needle ? all.filter((n) => fold(`${n.title}\n${n.body}`).includes(needle)) : all;
  const pinned = list.filter((n) => n.pinned);
  const others = list.filter((n) => !n.pinned);

  const grid = (items: Note[]) => (
    <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
      {items.map((n) => (
        <NoteCard key={n.id} note={n} />
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title={t.notes.title}
        subtitle={all.length > 0 && <span>{t.notes.count(all.length)}</span>}
        actions={
          <>
            <Button
              className="hidden pr-[18px] pl-3.5 md:inline-flex"
              onClick={() => openNote(null)}
            >
              <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
              {t.notes.add}
            </Button>
            <button
              type="button"
              aria-label={t.notes.add}
              onClick={() => openNote(null)}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-accent text-bg shadow-[0_8px_24px_rgb(212_240_74/0.3)] md:hidden"
            >
              <Plus className="size-5" strokeWidth={2.5} aria-hidden />
            </button>
          </>
        }
      />

      {all.length > 0 && (
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-dim" aria-hidden />
          <input
            type="search"
            aria-label={t.notes.search}
            placeholder={t.notes.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg pr-3.5 pl-10 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px]"
          />
        </label>
      )}

      {q.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
          <CardSkeleton className="min-h-[132px] rounded-[22px]" />
          <CardSkeleton className="min-h-[132px] rounded-[22px]" />
          <CardSkeleton className="min-h-[132px] rounded-[22px]" />
        </div>
      ) : q.isError ? (
        <div className="card">
          <ErrorState onRetry={() => q.refetch()} />
        </div>
      ) : all.length === 0 ? (
        <div className="relative card">
          <EmptyState
            icon={FileText}
            title={t.notes.empty}
            body={t.notes.emptyBody}
            action={
              <Button onClick={() => openNote(null)}>
                <Plus className="size-4" aria-hidden />
                {t.notes.add}
              </Button>
            }
          />
        </div>
      ) : list.length === 0 ? (
        <div className="relative card">
          <EmptyState icon={Search} title={t.notes.noMatch(query.trim())} className="py-6" />
        </div>
      ) : (
        <div className={cn("flex flex-col gap-5 md:gap-6")}>
          {pinned.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="relative m-0 label-caps">{t.notes.sections.pinned}</h2>
              {grid(pinned)}
            </section>
          )}
          {others.length > 0 && (
            <section className="flex flex-col gap-2.5">
              {pinned.length > 0 && (
                <h2 className="relative m-0 label-caps">{t.notes.sections.others}</h2>
              )}
              {grid(others)}
            </section>
          )}
        </div>
      )}
    </>
  );
}
