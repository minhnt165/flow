"use client";

import { create } from "zustand";
import type {
  BillView,
  CountdownView,
  Fund,
  HabitView,
  Note,
  PaletteColor,
  TodoView,
  Transaction,
} from "@/lib/supabase/types";

export type TxMode = "expense" | "income" | "transfer";

/** Giá trị điền sẵn khi tạo quỹ mục tiêu từ một countdown ("Gắn ngân sách"). */
export type FundPreset = {
  name: string;
  icon: string;
  color: PaletteColor;
  countdownId: string;
};

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

  fund: { open: boolean; editing: Fund | null; preset: FundPreset | null };
  openFund: (editing?: Fund | null, preset?: FundPreset | null) => void;
  closeFund: () => void;

  countdown: { open: boolean; editing: CountdownView | null };
  openCountdown: (editing?: CountdownView | null) => void;
  closeCountdown: () => void;

  bill: { open: boolean; editing: BillView | null };
  openBill: (editing?: BillView | null) => void;
  closeBill: () => void;

  /** Hộp thoại "Đánh dấu đã trả" cho một hoá đơn. */
  payBill: { open: boolean; bill: BillView | null };
  openPayBill: (bill: BillView) => void;
  closePayBill: () => void;

  todo: { open: boolean; editing: TodoView | null };
  openTodo: (editing?: TodoView | null) => void;
  closeTodo: () => void;

  habit: { open: boolean; editing: HabitView | null };
  openHabit: (editing?: HabitView | null) => void;
  closeHabit: () => void;

  note: { open: boolean; editing: Note | null };
  openNote: (editing?: Note | null) => void;
  closeNote: () => void;
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

  fund: { open: false, editing: null, preset: null },
  openFund: (editing = null, preset = null) => set({ fund: { open: true, editing, preset } }),
  closeFund: () => set((s) => ({ fund: { ...s.fund, open: false } })),

  countdown: { open: false, editing: null },
  openCountdown: (editing = null) => set({ countdown: { open: true, editing } }),
  closeCountdown: () => set((s) => ({ countdown: { ...s.countdown, open: false } })),

  bill: { open: false, editing: null },
  openBill: (editing = null) => set({ bill: { open: true, editing } }),
  closeBill: () => set((s) => ({ bill: { ...s.bill, open: false } })),

  payBill: { open: false, bill: null },
  openPayBill: (bill) => set({ payBill: { open: true, bill } }),
  closePayBill: () => set((s) => ({ payBill: { ...s.payBill, open: false } })),

  todo: { open: false, editing: null },
  openTodo: (editing = null) => set({ todo: { open: true, editing } }),
  closeTodo: () => set((s) => ({ todo: { ...s.todo, open: false } })),

  habit: { open: false, editing: null },
  openHabit: (editing = null) => set({ habit: { open: true, editing } }),
  closeHabit: () => set((s) => ({ habit: { ...s.habit, open: false } })),

  note: { open: false, editing: null },
  openNote: (editing = null) => set({ note: { open: true, editing } }),
  closeNote: () => set((s) => ({ note: { ...s.note, open: false } })),
}));
