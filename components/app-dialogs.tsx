"use client";

import { useEffect } from "react";
import { CountdownDialog } from "@/components/countdowns/countdown-dialog";
import { FundDialog } from "@/components/expenses/fund-dialog";
import { TransactionDialog } from "@/components/expenses/transaction-dialog";
import { useUi } from "@/stores/ui";

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

// Hộp thoại dùng chung toàn app + phím N mở "Thêm giao dịch".
export function AppDialogs() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target))
        return;
      const s = useUi.getState();
      if (s.tx.open || s.fund.open || s.countdown.open) return;
      e.preventDefault();
      s.openTx("expense");
    };
    // Shortcut PWA "Thêm giao dịch": /expenses?add=1
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "1") {
      useUi.getState().openTx("expense");
      params.delete("add");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <TransactionDialog />
      <FundDialog />
      <CountdownDialog />
    </>
  );
}
