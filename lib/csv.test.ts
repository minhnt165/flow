import { describe, expect, it } from "vitest";
import { transactionsToCsv } from "./csv";
import type { Transaction } from "@/lib/supabase/types";

const BOM = String.fromCharCode(0xfeff);

const base: Transaction = {
  id: "t1",
  user_id: "u",
  type: "expense",
  amount: 65000,
  fund_id: "f1",
  to_fund_id: null,
  category_id: "c1",
  note: 'Cơm "trưa", văn phòng',
  occurred_at: "2026-10-30T05:31:00Z",
  source: "telegram",
  recurring_rule_id: null,
  created_at: "2026-10-30T05:31:00Z",
};

describe("transactionsToCsv", () => {
  it("có BOM, tiêu đề tiếng Việt, giờ Việt Nam và escape dấu phẩy / ngoặc kép", () => {
    const csv = transactionsToCsv(
      [base],
      [{ id: "f1", name: "Sinh hoạt" }],
      [{ id: "c1", name: "Ăn uống" }],
    );
    const [header, row] = csv.replace(BOM, "").trim().split("\r\n");
    expect(csv.startsWith(BOM)).toBe(true);
    expect(header).toBe("Thời gian,Loại,Số tiền,Danh mục,Quỹ,Đến quỹ,Ghi chú,Nguồn");
    expect(row).toBe(
      '2026-10-30 12:31,Chi,65000,Ăn uống,Sinh hoạt,,"Cơm ""trưa"", văn phòng",Telegram',
    );
  });
});
