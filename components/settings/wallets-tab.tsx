"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppearancePicker } from "@/components/common/appearance-picker";
import { IconTile } from "@/components/common/icon-tile";
import { RowsSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useCategories, useDeleteCategory, useSaveCategory } from "@/hooks/use-categories";
import { useFunds } from "@/hooks/use-funds";
import { formatVND } from "@/lib/money";
import type { Category, CategoryType, PaletteColor } from "@/lib/supabase/types";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

function CategoryEditor({
  type,
  category,
  onDone,
}: {
  type: CategoryType;
  category?: Category;
  onDone: () => void;
}) {
  const save = useSaveCategory();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "circle-ellipsis");
  const [color, setColor] = useState<PaletteColor>(category?.color ?? "sky");
  const w = t.settings.wallets;
  return (
    <form
      className="flex items-center gap-2.5 border-t border-surface-2 py-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
          await save.mutateAsync({
            id: category?.id,
            input: { name: name.trim(), icon, color, type },
          });
          toast.success(w.categorySaved);
          onDone();
        } catch {
          toast.error(t.settings.saveError);
        }
      }}
    >
      <AppearancePicker
        icon={icon}
        color={color}
        onChange={(v) => (v.icon && setIcon(v.icon), v.color && setColor(v.color))}
        label={t.fundDialog.iconColor}
        iconLabel={t.fundDialog.icon}
        colorLabel={t.fundDialog.color}
      />
      <input
        autoFocus
        aria-label={w.categoryName}
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        placeholder={w.newCategory}
        className="min-h-12 min-w-0 grow rounded-[14px] border border-border bg-bg px-3.5 text-sm text-text outline-none focus-visible:border-accent/60"
      />
      <Button type="submit" size="icon-lg" aria-label={t.common.save} disabled={save.isPending}>
        <Check className="size-[18px]" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="field"
        size="icon-lg"
        aria-label={t.common.cancel}
        onClick={onDone}
      >
        <X className="size-[18px]" aria-hidden />
      </Button>
    </form>
  );
}

function CategoryList({ type, title }: { type: CategoryType; title: string }) {
  const q = useCategories();
  const del = useDeleteCategory();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const list = (q.data ?? []).filter((c) => c.type === type);
  const w = t.settings.wallets;
  return (
    <div className="flex flex-col card px-6 py-2">
      <div className="flex items-center justify-between pt-4 pb-2.5">
        <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden />
          {w.addCategory}
        </Button>
      </div>
      {q.isLoading && <RowsSkeleton rows={3} />}
      {list.map((c) =>
        editing === c.id ? (
          <CategoryEditor key={c.id} type={type} category={c} onDone={() => setEditing(null)} />
        ) : (
          <div key={c.id} className="flex items-center gap-3 border-t border-surface-2 py-3">
            <IconTile icon={c.icon} color={c.color} size={36} />
            <button
              type="button"
              onClick={() => setEditing(c.id)}
              aria-label={`${w.rename} ${c.name}`}
              className="min-h-11 grow cursor-pointer border-0 bg-transparent text-left text-sm font-medium text-text"
            >
              {c.name}
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${w.deleteCategory} ${c.name}`}
              onClick={async () => {
                try {
                  await del.mutateAsync(c.id);
                  toast.success(w.categoryDeleted);
                } catch {
                  toast.error(w.deleteInUse);
                }
              }}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ),
      )}
      {editing === "new" && <CategoryEditor type={type} onDone={() => setEditing(null)} />}
      <div className="h-2" />
    </div>
  );
}

function FundList() {
  const funds = useFunds();
  const openFund = useUi((s) => s.openFund);
  const w = t.settings.wallets;
  return (
    <div className="flex flex-col card px-6 py-2">
      <div className="flex items-center justify-between pt-4 pb-2.5">
        <h2 className="m-0 text-[15px] font-semibold">{w.funds}</h2>
        <Button variant="ghost" size="sm" onClick={() => openFund(null)}>
          <Plus className="size-4" aria-hidden />
          {w.addFund}
        </Button>
      </div>
      {funds.isLoading && <RowsSkeleton rows={3} />}
      {(funds.data ?? []).map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => openFund(f)}
          className="flex cursor-pointer items-center gap-3 border-0 border-t border-solid border-surface-2 bg-transparent py-3 text-left text-text"
        >
          <IconTile icon={f.icon} color={f.color} size={36} />
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{f.name}</span>
            <span className="text-xs text-muted-foreground">
              {w.kinds[f.kind]}
              {f.is_default && ` · ${t.funds.defaultBadge}`}
            </span>
          </span>
          <span className="font-display text-sm font-bold">{formatVND(f.balance)}</span>
        </button>
      ))}
      <div className="h-2" />
    </div>
  );
}

export function WalletsTab() {
  return (
    <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-5">
      <FundList />
      <CategoryList type="expense" title={t.settings.wallets.expenseCats} />
      <CategoryList type="income" title={t.settings.wallets.incomeCats} />
    </div>
  );
}
