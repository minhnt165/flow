"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { useToggleTodo } from "@/hooks/use-todos";
import { formatDate, formatDayMonth } from "@/lib/dates";
import type { TodoView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

/** "Hạn hôm nay" / "Hạn ngày mai" / "Hạn 05/11 · còn 6 ngày" / "Hạn 28/10 · trễ 2 ngày" */
export function dueText(todo: TodoView) {
  if (todo.days_left === null || !todo.due_on) return null;
  const n = todo.days_left;
  if (n === 0) return t.todos.dueToday;
  if (n === 1) return t.todos.dueTomorrow;
  const date = formatDayMonth(todo.due_on);
  return n < 0
    ? `${t.todos.due(date)} · ${t.todos.overdueBy(-n)}`
    : `${t.todos.due(date)} · ${t.todos.dueIn(n)}`;
}

export function TodoRow({ todo, compact }: { todo: TodoView; compact?: boolean }) {
  const openTodo = useUi((s) => s.openTodo);
  const toggle = useToggleTodo();
  const overdue = !todo.done && todo.days_left !== null && todo.days_left < 0;
  const firstNoteLine = todo.note?.split("\n")[0];
  const sub = todo.done
    ? todo.done_at
      ? t.todos.doneAt(formatDate(todo.done_at.slice(0, 10)))
      : null
    : [dueText(todo), firstNoteLine].filter(Boolean).join(" · ");

  const onToggle = async () => {
    try {
      await toggle.mutateAsync({ id: todo.id, done: !todo.done });
    } catch {
      toast.error(t.todos.dialog.errors.save);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-surface-2 last:border-b-0",
        compact ? "py-1" : "py-1.5",
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.done ? t.todos.markUndone(todo.title) : t.todos.markDone(todo.title)}
        onClick={onToggle}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0"
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
            todo.done ? "border-accent bg-accent text-bg" : "border-border-strong bg-bg",
          )}
        >
          {todo.done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      <button
        type="button"
        onClick={() => openTodo(todo)}
        className="flex min-h-11 min-w-0 grow cursor-pointer flex-col justify-center gap-[3px] border-0 bg-transparent p-0 text-left text-text"
      >
        <span
          className={cn(
            "truncate text-[15px] font-medium",
            todo.done && "text-soft line-through decoration-dim",
          )}
        >
          {todo.title}
        </span>
        {sub && (
          <span
            className={cn(
              "truncate text-xs text-muted-foreground",
              overdue && "font-medium text-danger",
            )}
          >
            {sub}
          </span>
        )}
      </button>
    </div>
  );
}
