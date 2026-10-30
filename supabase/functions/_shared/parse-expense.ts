// Parser tin nhắn ghi chi tiêu cho bot Telegram. Thuần, chạy được cả Deno và Vitest.
// Ví dụ: "65k cơm trưa", "cơm trưa 65k", "820.000 tiền điện", "1tr2 quà sinh nhật", "+22tr lương".

export type ParsedEntry = {
  type: "expense" | "income";
  amount: number;
  note: string;
  /** Tên danh mục mặc định đoán được; không đoán được thì "Khác". */
  category: string;
};

const MAX_AMOUNT = 99_999_999_999_999;

const UNIT: Record<string, number> = {
  k: 1e3,
  K: 1e3,
  nghìn: 1e3,
  nghin: 1e3,
  ngàn: 1e3,
  ngan: 1e3,
  ng: 1e3,
  tr: 1e6,
  triệu: 1e6,
  trieu: 1e6,
  m: 1e6,
  M: 1e6,
  củ: 1e6,
  cu: 1e6,
  tỷ: 1e9,
  ty: 1e9,
  đ: 1,
  d: 1,
  vnd: 1,
  vnđ: 1,
  "₫": 1,
};
const UNIT_RE = Object.keys(UNIT)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const TOKEN_RE = new RegExp(`^(\\d+(?:[.,]\\d+)*)(${UNIT_RE})?(\\d{1,3})?$`);

/** "820.000" → 820000; "1.5" / "1,5" → 1.5; "1.250.000" → 1250000. */
function parseNumber(s: string, hasUnit: boolean): number | null {
  const parts = s.split(/[.,]/);
  if (parts.length === 1) return Number(parts[0]);
  const groupedThousands = parts.slice(1).every((p) => p.length === 3);
  if (groupedThousands && (!hasUnit || parts.length > 2)) return Number(parts.join(""));
  if (parts.length === 2) return Number(`${parts[0]}.${parts[1]}`);
  return null;
}

type Candidate = { index: number; consumed: number; amount: number; explicit: boolean };

function parseToken(raw: string, next: string | undefined, index: number): Candidate | null {
  const token = raw.replace(/^[+]/, "").replace(/[,:;!?]+$/, "");
  const m = token.match(TOKEN_RE);
  if (m) {
    const [, num, unit, tail] = m;
    if (tail && !unit) return null;
    let mult = unit ? UNIT[unit] : 0;
    let consumed = 1;
    // "2 triệu", "500 nghìn": đơn vị nằm ở token kế tiếp.
    if (!unit && next && UNIT[next.toLowerCase()] && UNIT[next.toLowerCase()] > 1) {
      mult = UNIT[next.toLowerCase()];
      consumed = 2;
    }
    // Chỉ đơn vị k / tr / tỷ mới cho phép phần thập phân ("1.5tr"); "150.000đ" vẫn là dấu nghìn.
    const value = parseNumber(num, mult > 1);
    if (value === null || !Number.isFinite(value)) return null;
    const explicit = mult > 0 || /[.,]/.test(num);
    if (!mult) mult = value < 1000 && !/[.,]/.test(num) ? 1e3 : 1; // "35" = 35k
    let amount = value * mult;
    // "1tr2" = 1.200.000, "1tr25" = 1.250.000, "2k5" = 2.500
    if (tail) amount += (Number(tail) / 10 ** tail.length) * mult;
    amount = Math.round(amount);
    if (amount <= 0 || amount > MAX_AMOUNT) return null;
    return { index, consumed, amount, explicit };
  }
  return null;
}

/** Bỏ dấu tiếng Việt để so khớp từ khoá ("cà phê" ~ "ca phe"). */
export function fold(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

const EXPENSE_KEYWORDS: [string, string[]][] = [
  [
    "Ăn uống",
    [
      "com",
      "pho",
      "bun",
      "mien",
      "mi",
      "banh mi",
      "banh",
      "chao",
      "lau",
      "nuong",
      "an",
      "an sang",
      "an trua",
      "an toi",
      "an vat",
      "an uong",
      "do an",
      "uong",
      "cafe",
      "ca phe",
      "coffee",
      "cf",
      "tra sua",
      "tra",
      "nuoc mia",
      "nuoc ep",
      "sinh to",
      "bia",
      "nhau",
      "kem",
      "pizza",
      "kfc",
      "lotteria",
      "buffet",
      "highlands",
      "starbucks",
      "di cho",
      "cho",
      "rau",
      "thit",
      "ca",
      "trai cay",
    ],
  ],
  [
    "Đi lại",
    [
      "grab",
      "xang",
      "do xang",
      "taxi",
      "xe",
      "gui xe",
      "ve xe",
      "xe buyt",
      "bus",
      "gojek",
      "xanh sm",
      "uber",
      "ve may bay",
      "may bay",
      "tau",
      "sua xe",
      "rua xe",
      "phi duong",
      "cau duong",
      "parking",
    ],
  ],
  [
    "Hoá đơn",
    [
      "dien",
      "tien dien",
      "nuoc",
      "tien nuoc",
      "wifi",
      "internet",
      "mang",
      "tien nha",
      "thue nha",
      "nha",
      "gas",
      "dien thoai",
      "cuoc",
      "4g",
      "5g",
      "truyen hinh",
      "phi quan ly",
      "hoa don",
    ],
  ],
  [
    "Mua sắm",
    [
      "mua",
      "mua sam",
      "ao",
      "quan",
      "giay",
      "dep",
      "tui",
      "shopee",
      "lazada",
      "tiki",
      "sendo",
      "qua",
      "do gia dung",
      "my pham",
      "son",
      "sieu thi",
      "dong ho",
      "kinh",
    ],
  ],
  [
    "Giải trí",
    [
      "phim",
      "xem phim",
      "cgv",
      "lotte cinema",
      "netflix",
      "spotify",
      "youtube",
      "game",
      "karaoke",
      "du lich",
      "ve",
      "concert",
      "giai tri",
      "bida",
      "bowling",
    ],
  ],
  [
    "Sức khoẻ",
    [
      "thuoc",
      "kham",
      "kham benh",
      "benh vien",
      "phong kham",
      "gym",
      "yoga",
      "nha khoa",
      "rang",
      "vitamin",
      "bao hiem",
      "suc khoe",
      "spa",
    ],
  ],
  [
    "Giáo dục",
    ["sach", "hoc", "hoc phi", "khoa hoc", "udemy", "coursera", "ielts", "tieng anh", "giao duc"],
  ],
];

const INCOME_KEYWORDS: [string, string[]][] = [
  ["Lương", ["luong", "salary"]],
  ["Thưởng", ["thuong", "bonus", "hoa hong"]],
];

/** Đoán danh mục: chọn từ khoá dài nhất khớp nguyên từ trong ghi chú. */
export function guessCategory(note: string, type: "expense" | "income"): string {
  const text = ` ${fold(note)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
  let best = { name: "Khác", len: 0 };
  for (const [name, words] of type === "income" ? INCOME_KEYWORDS : EXPENSE_KEYWORDS) {
    for (const w of words) {
      if (w.length > best.len && text.includes(` ${w} `)) best = { name, len: w.length };
    }
  }
  return best.name;
}

export function parseEntry(input: string): ParsedEntry | null {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text || text.startsWith("/")) return null;
  const type = text.startsWith("+") ? "income" : "expense";
  const tokens = text.replace(/^\+\s*/, "+").split(" ");

  const candidates: Candidate[] = [];
  tokens.forEach((tok, i) => {
    const c = parseToken(tok, tokens[i + 1], i);
    if (c) candidates.push(c);
  });
  if (!candidates.length) return null;
  // Ưu tiên token có đơn vị / dấu chấm nghìn ("500k" hơn "2027"), rồi tới token đứng trước.
  const pick = candidates.find((c) => c.explicit) ?? candidates[0];

  const note = tokens
    .filter((_, i) => i < pick.index || i >= pick.index + pick.consumed)
    .join(" ")
    .replace(/^[\s+\-–:·,]+|[\s\-–:·,]+$/g, "")
    .trim();

  return { type, amount: pick.amount, note, category: guessCategory(note, type) };
}

/** Mã liên kết 6 ký tự, có hoặc không có gạch: "7X4K29", "7x4k-29". */
export function looksLikeLinkCode(text: string) {
  return /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{2}$/.test(text.trim()) && /[A-Za-z]/.test(text);
}
