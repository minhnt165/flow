"use client";

import { useState } from "react";
import { toast } from "sonner";
import { dueText } from "@/components/bills/bills-view";
import { AmountInput } from "@/components/common/amount-input";
import { FormAlert } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePayBill } from "@/hooks/use-bills";
import { useLookups } from "@/hooks/use-lookups";
import { APP_TZ, formatDayMonth, localDate, localTime, toIso } from "@/lib/dates";
import { formatVND } from "@/lib/money";
import type { BillView } from "@/lib/supabase/types";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

const inputCls =
  "min-h-12 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none focus-visible:border-accent/60 md:text-[15px] [color-scheme:dark]";

function PayForm({ bill }: { bill: BillView }) {
  const close = useUi((s) => s.closePayBill);
  const pay = usePayBill();
  const { catById, fundById } = useLookups();
  const cat = bill.category_id ? catById.get(bill.category_id) : undefined;
  const fund = fundById.get(bill.fund_id);
  const today = localDate(new Date(), APP_TZ);
  const p = t.bills.pay;

  const [amount, setAmount] = useState(bill.amount);
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string>();

  const submit = async () => {
    if (amount <= 0) return setError(t.bills.dialog.errors.amount);
    setError(undefined);
    try {
      const r = await pay.mutateAsync({
        id: bill.id,
        amount,
        // Trả hôm nay: để server lấy giờ hiện tại; ngày khác: giữ giờ hiện tại của ngày đó.
        paidAt: date === today ? undefined : toIso(date, localTime(new Date(), APP_TZ)),
      });
      toast.success(p.done(formatVND(Number(r.amount)), formatDayMonth(r.next_run_on)));
      close();
    } catch {
      setError(p.error);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-5 p-[22px] pt-[max(22px,env(safe-area-inset-top))] md:px-7 md:pt-6 md:pb-7"
    >
      <DialogHeader>
        <DialogTitle>{p.title}</DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-3.5 rounded-[18px] border border-surface-2 bg-bg px-4 py-3.5">
        <IconTile icon={cat?.icon ?? "zap"} color={cat?.color ?? "green"} size={42} />
        <span className="flex min-w-0 grow flex-col gap-[3px]">
          <span className="truncate text-[15px] font-semibold">{bill.name}</span>
          <span className="truncate text-xs text-muted-foreground">{dueText(bill)}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="pay-amount" className="label-caps">
            {p.amount}
          </label>
          <AmountInput
            id="pay-amount"
            value={amount}
            onChange={setAmount}
            autoFocus
            inputClassName="text-lg"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="pay-date" className="label-caps">
            {p.date}
          </label>
          <input
            id="pay-date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            className={inputCls}
          />
        </div>
      </div>

      <span className="text-[13px] text-muted-foreground">
        {p.into(fund?.name ?? "—", cat?.name ?? "Hoá đơn")}
      </span>

      <FormAlert error={error} />

      <div className="flex flex-wrap justify-end gap-2.5 pt-1 max-md:sticky max-md:bottom-0 max-md:-mx-[22px] max-md:-mb-[22px] max-md:border-t max-md:border-surface-2 max-md:bg-surface max-md:px-[22px] max-md:py-3 max-md:pb-[max(12px,env(safe-area-inset-bottom))]">
        <Button type="button" variant="field" size="md" className="min-h-12 px-5" onClick={close}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="md" className="min-h-12 px-6" disabled={pay.isPending}>
          {pay.isPending ? t.common.saving : p.submit(formatVND(amount))}
        </Button>
      </div>
    </form>
  );
}

export function PayBillDialog() {
  const open = useUi((s) => s.payBill.open);
  const bill = useUi((s) => s.payBill.bill);
  const close = useUi((s) => s.closePayBill);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="sm">
        {open && bill && <PayForm key={bill.id} bill={bill} />}
      </DialogContent>
    </Dialog>
  );
}
