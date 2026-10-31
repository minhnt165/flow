"use client";

import { Plus, SquareCheckBig, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardSkeleton, EmptyState, ErrorState, RowsSkeleton } from "@/components/common/states";
import { PageHeader } from "@/components/layout/page";
import { TodoRow } from "@/components/todos/todo-row";
import { Button } from "@/components/ui/button";
import { useClearDoneTodos, useSaveTodo, useTodos } from "@/hooks/use-todos";
import type { TodoView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

type Section = "overdue" | "today" | "soon" | "later" | "nodate";
const SECTIONS: Section[] = ["overdue", "today", "soon", "later", "nodate"];

export function sectionOf(todo: TodoView): Section {
  if (todo.days_left === null) return "nodate";
  if (todo.days_left < 0) return "overdue";
  if (todo.days_left === 0) return "today";
  if (todo.days_left <= 7) return "soon";
  return "later";
}

/** Việc chưa xong, hạn gần trước; cùng hạn thì việc mới thêm lên trước. */
export function sortOpen(a: TodoView, b: TodoView) {
  return (a.days_left ?? 0) - (b.days_left ?? 0) || b.created_at.localeCompare(a.created_at);
}

const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px]";

/** Ô thêm nhanh: gõ tên, Enter là lưu (không hạn). Chi tiết hơn thì mở hộp thoại. */
function QuickAdd() {
  const save = useSaveTodo();
  const [title, setTitle] = useState("");
  const submit = async () => {
    const name = title.trim();
    if (!name || save.isPending) return;
    try {
      await save.mutateAsync({ input: { title: name, note: null, due_on: null } });
      setTitle("");
    } catch {
      toast.error(t.todos.dialog.errors.save);
    }
  };
  return (
    <form
      className="relative flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center gap-2">
        <input
          aria-label={t.todos.quickAddLabel}
          value={title}
          maxLength={120}
          enterKeyHint="done"
          placeholder={t.todos.quickAdd}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
        <Button
          type="submit"
          size="icon-lg"
          aria-label={t.todos.add}
          disabled={!title.trim() || save.isPending}
          className="size-12 shrink-0"
        >
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        </Button>
      </div>
      <span className="px-1 text-[11px] text-dim">{t.todos.quickAddHint}</span>
    </form>
  );
}

export function TodosView() {
  const q = useTodos();
  const openTodo = useUi((s) => s.openTodo);
  const clear = useClearDoneTodos();
  const [showDone, setShowDone] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const all = q.data ?? [];
  const open = all.filter((x) => !x.done);
  const done = all
    .filter((x) => x.done)
    .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const groups = SECTIONS.map((key) => ({
    key,
    items: open.filter((x) => sectionOf(x) === key).sort(sortOpen),
  })).filter((g) => g.items.length > 0);

  const onClear = async () => {
    if (!confirmClear) return setConfirmClear(true);
    try {
      await clear.mutateAsync(done.map((x) => x.id));
      toast.success(t.todos.cleared(done.length));
      setConfirmClear(false);
      setShowDone(false);
    } catch {
      toast.error(t.todos.dialog.errors.save);
    }
  };

  return (
    <>
      <PageHeader
        title={t.todos.title}
        subtitle={all.length > 0 && <span>{t.todos.openCount(open.length)}</span>}
        actions={
          <Button className="pr-[18px] pl-3.5" onClick={() => openTodo(null)}>
            <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
            {t.todos.add}
          </Button>
        }
      />

      <QuickAdd />

      {q.isLoading ? (
        <>
          <CardSkeleton className="min-h-[120px]" />
          <RowsSkeleton />
        </>
      ) : q.isError ? (
        <div className="card">
          <ErrorState onRetry={() => q.refetch()} />
        </div>
      ) : all.length === 0 ? (
        <div className="relative card">
          <EmptyState icon={SquareCheckBig} title={t.todos.empty} body={t.todos.emptyBody} />
        </div>
      ) : (
        <>
          {open.length === 0 ? (
            <div className="relative card">
              <EmptyState icon={SquareCheckBig} title={t.todos.allDone} className="py-6" />
            </div>
          ) : (
            <div className="relative flex flex-col gap-5 md:gap-6 md:card md:px-6 md:py-5">
              {groups.map((g) => (
                <section key={g.key} className="flex flex-col">
                  <h2 className={cn("m-0 pb-1.5 label-caps", g.key === "overdue" && "text-danger")}>
                    {t.todos.sections[g.key]}
                  </h2>
                  {g.items.map((todo) => (
                    <TodoRow key={todo.id} todo={todo} />
                  ))}
                </section>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <section className="relative flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={showDone}
                  onClick={() => setShowDone((v) => !v)}
                >
                  {showDone ? t.todos.hideDone : t.todos.showDone(done.length)}
                </Button>
                {showDone && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={clear.isPending}
                    onClick={onClear}
                    onBlur={() => setConfirmClear(false)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {confirmClear ? t.todos.clearDoneConfirm(done.length) : t.todos.clearDone}
                  </Button>
                )}
              </div>
              {showDone && (
                <div className="flex flex-col md:card md:px-6 md:py-3">
                  {done.map((todo) => (
                    <TodoRow key={todo.id} todo={todo} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
