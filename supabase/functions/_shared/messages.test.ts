import { describe, expect, it } from "vitest";
import { escapeHtml, msg } from "./messages.ts";

describe("tin nhắn Telegram", () => {
  it("escape HTML của nội dung người dùng", () => {
    expect(escapeHtml("<b>x</b> & y")).toBe("&lt;b&gt;x&lt;/b&gt; &amp; y");
    expect(
      msg.logged({
        type: "expense",
        amount: 65_000,
        category: "Ăn uống",
        fund: "Sinh hoạt",
        note: "<script>",
      }),
    ).toContain("&lt;script&gt;");
  });

  it("xác nhận ghi chi tiêu kèm ngân sách còn lại", () => {
    expect(
      msg.logged({
        type: "expense",
        amount: 65_000,
        category: "Ăn uống",
        fund: "Sinh hoạt",
        note: "cơm trưa",
        budget_remaining: 3_485_000,
      }),
    ).toBe(
      "Đã ghi <b>65.000 ₫</b> · Ăn uống\ncơm trưa\nQuỹ Sinh hoạt\nNgân sách tháng còn <b>3.485.000 ₫</b>",
    );
    expect(msg.loggedKeyboard("abc")).toEqual([
      [
        { text: "Đổi danh mục", callback_data: "cat:abc" },
        { text: "Xoá", callback_data: "del:abc" },
      ],
    ]);
  });

  it("nhắc countdown và tự động chuyển đúng câu chữ trong tài liệu", () => {
    expect(msg.countdown("Tết", "2027-02-06", 3)).toBe(
      "Còn <b>3 ngày</b> đến <b>Tết</b> · Thứ Bảy, 06/02",
    );
    expect(msg.countdown("Tết", "2027-02-06", 0)).toBe("Hôm nay là <b>Tết</b> · Thứ Bảy, 06/02");
    expect(msg.autoTransfer(1_000_000, "Quỹ Tết")).toBe(
      "Đã tự động chuyển <b>1.000.000 ₫</b> vào <b>Quỹ Tết</b>.",
    );
  });

  it("callback_data không vượt 64 byte", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(new TextEncoder().encode(`sc:${uuid}:10`).length).toBeLessThanOrEqual(64);
    expect(
      new TextEncoder().encode(msg.billKeyboard(uuid)[0][0].callback_data).length,
    ).toBeLessThanOrEqual(64);
  });

  it("tổng kết buổi tối so với trung bình 7 ngày", () => {
    expect(
      msg.evening({
        total: 120_000,
        avg7: 100_000,
        by_category: [{ name: "Ăn uống", amount: 120_000 }],
      }),
    ).toBe(
      "Hôm nay bạn chi <b>120.000 ₫</b> · cao hơn 20% so với trung bình 7 ngày (100.000 ₫)\n• Ăn uống: 120.000 ₫",
    );
    expect(msg.evening({ total: 0, avg7: 50_000, by_category: [] })).toContain(
      "chưa ghi khoản chi nào",
    );
  });
});
