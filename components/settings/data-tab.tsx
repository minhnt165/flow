"use client";

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLookups } from "@/hooks/use-lookups";
import { transactionsToCsv } from "@/lib/csv";
import { APP_TZ, localDate } from "@/lib/dates";
import { deleteAccount } from "@/lib/supabase/account";
import { getBrowserClient } from "@/lib/supabase/client";
import { listAllTransactions } from "@/lib/supabase/transactions";
import { t } from "@/messages/vi";

export function DataTab() {
  const { funds, categories } = useLookups();
  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const d = t.settings.data;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await listAllTransactions(getBrowserClient());
      const blob = new Blob([transactionsToCsv(all, funds, categories)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flow-giao-dich-${localDate(new Date(), APP_TZ)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(d.exportDone(all.length));
    } catch {
      toast.error(t.settings.saveError);
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteAccount(getBrowserClient());
      window.location.assign("/login");
    } catch {
      toast.error(d.deleteFailed);
      setDeleting(false);
    }
  };

  return (
    <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-5">
      <div className="flex flex-col gap-4 card p-6">
        <h2 className="m-0 text-[15px] font-semibold">{d.exportTitle}</h2>
        <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">{d.exportBody}</p>
        <Button size="md" className="self-start" onClick={exportCsv} disabled={exporting}>
          <Download className="size-4" aria-hidden />
          {exporting ? d.exporting : d.export}
        </Button>
      </div>
      <div className="flex flex-col gap-4 card border-cat-red/30 p-6">
        <h2 className="m-0 text-[15px] font-semibold text-danger">{d.deleteTitle}</h2>
        <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">{d.deleteBody}</p>
        <div className="flex flex-col gap-2">
          <label htmlFor="del-confirm" className="label-caps">
            {d.deleteConfirmLabel(d.deleteWord)}
          </label>
          <input
            id="del-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="min-h-12 rounded-[14px] border border-border bg-bg px-3.5 text-[15px] text-text outline-none focus-visible:border-danger/60"
          />
        </div>
        <Button
          variant="danger"
          size="md"
          className="self-start"
          disabled={confirm.trim().toUpperCase() !== d.deleteWord || deleting}
          onClick={remove}
        >
          <Trash2 className="size-4" aria-hidden />
          {deleting ? d.deleting : d.delete}
        </Button>
      </div>
    </div>
  );
}
