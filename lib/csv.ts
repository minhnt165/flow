import { APP_TZ, localDate, localTime } from "@/lib/dates";
import type { Category, Fund, Transaction } from "@/lib/supabase/types";
import { t } from "@/messages/vi";

const BOM = String.fromCharCode(0xfeff);

function cell(v: string | number | null | undefined) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV toàn bộ giao dịch; có BOM để Excel đọc đúng tiếng Việt. Số tiền là số nguyên (không dấu chấm). */
export function transactionsToCsv(
  transactions: Transaction[],
  funds: Pick<Fund, "id" | "name">[],
  categories: Pick<Category, "id" | "name">[],
) {
  const fund = new Map(funds.map((f) => [f.id, f.name]));
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const d = t.settings.data;
  const rows = transactions.map((tx) => {
    const at = new Date(tx.occurred_at);
    return [
      `${localDate(at, APP_TZ)} ${localTime(at, APP_TZ)}`,
      d.types[tx.type] ?? tx.type,
      tx.amount,
      tx.category_id ? (cat.get(tx.category_id) ?? "") : "",
      fund.get(tx.fund_id) ?? "",
      tx.to_fund_id ? (fund.get(tx.to_fund_id) ?? "") : "",
      tx.note ?? "",
      d.sources[tx.source] ?? tx.source,
    ]
      .map(cell)
      .join(",");
  });
  return BOM + [d.csvHeader.map(cell).join(","), ...rows].join("\r\n") + "\r\n";
}
