import { describe, expect, it } from "vitest";
import { guessCategory, looksLikeLinkCode, parseEntry } from "./parse-expense.ts";

describe("parseEntry – ví dụ trong tài liệu", () => {
  it.each([
    ["65k cơm trưa", { type: "expense", amount: 65_000, note: "cơm trưa", category: "Ăn uống" }],
    ["cơm trưa 65k", { type: "expense", amount: 65_000, note: "cơm trưa", category: "Ăn uống" }],
    [
      "820.000 tiền điện",
      { type: "expense", amount: 820_000, note: "tiền điện", category: "Hoá đơn" },
    ],
    [
      "1tr2 quà sinh nhật",
      { type: "expense", amount: 1_200_000, note: "quà sinh nhật", category: "Mua sắm" },
    ],
    ["+22tr lương", { type: "income", amount: 22_000_000, note: "lương", category: "Lương" }],
  ])("%s", (input, expected) => {
    expect(parseEntry(input)).toEqual(expected);
  });
});

describe("parseEntry – số tiền", () => {
  it.each([
    ["grab 45k", 45_000],
    ["1.5tr tiền nhà", 1_500_000],
    ["1,5tr tiền nhà", 1_500_000],
    ["2 triệu học phí", 2_000_000],
    ["500 nghìn đổ xăng", 500_000],
    ["cafe 35", 35_000],
    ["65000", 65_000],
    ["1tr25 bảo hiểm", 1_250_000],
    ["2k5 gửi xe", 2_500],
    ["1.250.000 khám răng", 1_250_000],
    ["3 củ tiền nhà", 3_000_000],
    ["quà tết 2027 500k", 500_000],
    ["150.000đ thuốc", 150_000],
    ["+5tr thưởng dự án", 5_000_000],
  ])("%s → %d", (input, amount) => {
    expect(parseEntry(input)?.amount).toBe(amount);
  });

  it("giữ phần còn lại làm ghi chú, bỏ dấu câu thừa", () => {
    expect(parseEntry("quà tết 2027 500k")?.note).toBe("quà tết 2027");
    expect(parseEntry("65k - cơm trưa")?.note).toBe("cơm trưa");
    expect(parseEntry("65000")?.note).toBe("");
  });

  it("tin không có số tiền thì không tạo gì", () => {
    expect(parseEntry("xin chào")).toBeNull();
    expect(parseEntry("")).toBeNull();
    expect(parseEntry("/start")).toBeNull();
    expect(parseEntry("0k")).toBeNull();
  });
});

describe("guessCategory", () => {
  it("khớp cả khi gõ không dấu và chọn từ khoá dài nhất", () => {
    expect(guessCategory("tra sua", "expense")).toBe("Ăn uống");
    expect(guessCategory("nước mía", "expense")).toBe("Ăn uống");
    expect(guessCategory("tiền nước", "expense")).toBe("Hoá đơn");
    expect(guessCategory("vé xe về quê", "expense")).toBe("Đi lại");
    expect(guessCategory("nha khoa", "expense")).toBe("Sức khoẻ");
    expect(guessCategory("Grab đi làm", "expense")).toBe("Đi lại");
    expect(guessCategory("linh tinh", "expense")).toBe("Khác");
    expect(guessCategory("thưởng dự án", "income")).toBe("Thưởng");
    expect(guessCategory("bán đồ cũ", "income")).toBe("Khác");
  });
});

describe("looksLikeLinkCode", () => {
  it("nhận mã có hoặc không có gạch", () => {
    expect(looksLikeLinkCode("7X4K29")).toBe(true);
    expect(looksLikeLinkCode("7x4k-29")).toBe(true);
    expect(looksLikeLinkCode("65k cơm")).toBe(false);
    expect(looksLikeLinkCode("123456")).toBe(false);
  });
});
