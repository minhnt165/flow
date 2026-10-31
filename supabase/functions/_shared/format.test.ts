import { describe, expect, it } from "vitest";
import {
  amountSuggestions,
  formatAmountInput,
  formatCompact,
  formatMillions,
  formatSigned,
  formatVND,
  parseAmountInput,
  readVND,
} from "./format.ts";

describe("amountSuggestions", () => {
  it("gợi ý ×1.000 / ×10.000 / ×100.000 cho số đang gõ", () => {
    expect(amountSuggestions(45)).toEqual([45_000, 450_000, 4_500_000]);
    expect(amountSuggestions(450)).toEqual([450_000, 4_500_000, 45_000_000]);
    expect(amountSuggestions(65_000)).toEqual([65_000_000, 650_000_000, 6_500_000_000]);
    expect(amountSuggestions(120_000)).toEqual([120_000_000, 1_200_000_000]);
  });
  it("không gợi ý khi rỗng hoặc đã là số tiền đầy đủ", () => {
    expect(amountSuggestions(0)).toEqual([]);
    expect(amountSuggestions(1_000_000)).toEqual([]);
    expect(amountSuggestions(4_500_000)).toEqual([]);
  });
});

describe("formatVND", () => {
  it("dùng dấu chấm nghìn và ký hiệu ₫, không số lẻ", () => {
    expect(formatVND(8450000)).toBe("8.450.000 ₫");
    expect(formatVND(0)).toBe("0 ₫");
    expect(formatVND(999.6)).toBe("1.000 ₫");
  });
  it("định dạng có dấu cho bảng giao dịch", () => {
    expect(formatSigned(65000, "-")).toBe("−65.000");
    expect(formatSigned(22000000, "+")).toBe("+22.000.000");
  });
  it("dạng gọn cho mobile", () => {
    expect(formatCompact(3200000)).toBe("3.2tr");
    expect(formatCompact(1750000)).toBe("1.75tr");
    expect(formatCompact(65000)).toBe("65k");
    expect(formatMillions(12000000)).toBe("12 triệu");
    expect(formatMillions(1500000)).toBe("1,5 triệu");
  });
});

describe("ô nhập số tiền", () => {
  it("bỏ ký tự thừa và tự thêm dấu chấm", () => {
    expect(parseAmountInput("8.450.000 ₫")).toBe(8450000);
    expect(parseAmountInput("")).toBe(0);
    expect(formatAmountInput("8450000")).toBe("8.450.000");
    expect(formatAmountInput("00065")).toBe("65");
    expect(formatAmountInput("")).toBe("");
  });
});

describe("readVND", () => {
  it.each([
    [0, "Không đồng"],
    [65000, "Sáu mươi lăm nghìn đồng"],
    [8450000, "Tám triệu bốn trăm năm mươi nghìn đồng"],
    [105000, "Một trăm linh năm nghìn đồng"],
    [21000, "Hai mươi mốt nghìn đồng"],
    [15000, "Mười lăm nghìn đồng"],
    [24000, "Hai mươi tư nghìn đồng"],
    [1005000, "Một triệu không trăm linh năm nghìn đồng"],
    [1200000, "Một triệu hai trăm nghìn đồng"],
    [2000000000, "Hai tỷ đồng"],
    [1000000000000, "Một nghìn tỷ đồng"],
    [3000500000, "Ba tỷ năm trăm nghìn đồng"],
    [3000050000, "Ba tỷ không trăm năm mươi nghìn đồng"],
  ])("%d → %s", (n, text) => {
    expect(readVND(n)).toBe(text);
  });
});
