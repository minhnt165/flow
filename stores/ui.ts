"use client";

import { create } from "zustand";
import type { CountdownView, Fund, Transaction } from "@/lib/supabase/types";

export type TxMode = "expense" | "income" | "transfer";

type TxDialog = {
  open: boolean;
  /** Tăng mỗi lần mở để form khởi tạo lại từ đầu. */
  seq: number;
  mode: TxMode;
  editing: Transaction | null;
  preset: { fundId?: string; toFundId?: string; amount?: number } | null;
};

type UiState = {
  tx: TxDialog;
  openTx: (mode?: TxMode, preset?: TxDialog["preset"]) => void;
  editTx: (tx: Transaction) => void;
  closeTx: () => void;

  fund: { open: boolean; editing: Fund | null };
  openFund: (editing?: Fund | null) => void;
  closeFund: () => void;

  countdown: { open: boolean; editing: CountdownView | null };
  openCountdown: (editing?: CountdownView | null) => void;
  closeCountdown: () => void;
};

// State UI nhỏ: hộp thoại nào đang mở. Dữ liệu server nằm trong TanStack Query.
export const useUi = create<UiState>((set) => ({
  tx: { open: false, seq: 0, mode: "expense", editing: null, preset: null },
  openTx: (mode = "expense", preset = null) =>
    set((s) => ({ tx: { open: true, seq: s.tx.seq + 1, mode, editing: null, preset } })),
  editTx: (tx) =>
    set((s) => ({
      tx: { open: true, seq: s.tx.seq + 1, mode: tx.type, editing: tx, preset: null },
    })),
  closeTx: () => set((s) => ({ tx: { ...s.tx, open: false } })),

  fund: { open: false, editing: null },
  openFund: (editing = null) => set({ fund: { open: true, editing } }),
  closeFund: () => set((s) => ({ fund: { ...s.fund, open: false } })),

  countdown: { open: false, editing: null },
  openCountdown: (editing = null) => set({ countdown: { open: true, editing } }),
  closeCountdown: () => set((s) => ({ countdown: { ...s.countdown, open: false } })),
}));
