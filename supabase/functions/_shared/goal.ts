// Kế hoạch quỹ mục tiêu tính phía client (xem trước khi gõ, kịch bản dự báo).
// Cùng quy tắc với SQL (fn_pay_periods, v_fund_goal_progress): kỳ lương d với today < d < hạn,
// góp mỗi kỳ làm tròn lên bội số 50.000 ₫.
import { daysBetween } from "./dates.ts";

export const PER_PERIOD_STEP = 50_000;

const pad = (n: number) => String(n).padStart(2, "0");

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Ngày lương của tháng (y, m: 1–12); tháng ngắn hơn lấy ngày cuối tháng. */
export function salaryDateOf(y: number, m: number, salaryDay: number): string {
  return `${y}-${pad(m)}-${pad(Math.min(salaryDay, daysInMonth(y, m)))}`;
}

/** Các ngày lương d với from < d < to. */
export function salaryDatesBetween(from: string, to: string, salaryDay: number): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  for (let i = 0; i < 600; i++) {
    const d = salaryDateOf(y, m, salaryDay);
    if (d >= to) break;
    if (d > from) out.push(d);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function payPeriods(from: string, to: string | null, salaryDay: number): number {
  if (!to || to <= from) return 0;
  return salaryDatesBetween(from, to, salaryDay).length;
}

/** Ngày lương thứ k (k ≥ 1) sau `after`. */
export function nthSalaryDateAfter(after: string, salaryDay: number, k: number): string {
  let [y, m] = after.split("-").map(Number);
  let count = 0;
  for (let i = 0; i < 1200; i++) {
    const d = salaryDateOf(y, m, salaryDay);
    if (d > after) {
      count += 1;
      if (count === k) return d;
    }
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return after;
}

/** Ngày đến hạn đầu tiên ≥ `from` của hoá đơn rơi vào `dayOfMonth` (tháng ngắn lấy ngày cuối). */
export function dueDateOnOrAfter(from: string, dayOfMonth: number): string {
  const [y, m] = from.split("-").map(Number);
  const thisMonth = salaryDateOf(y, m, dayOfMonth);
  return thisMonth >= from ? thisMonth : nthSalaryDateAfter(from, dayOfMonth, 1);
}

/**
 * `n` hạn liên tiếp (mỗi tháng một lần) kể từ hạn đầu tiên ≥ `from`: các tháng có thể bắt đầu
 * chu kỳ của hoá đơn trả mỗi `n` tháng. Giữ ngày trong tháng, tháng ngắn lấy ngày cuối.
 */
export function dueDatesFrom(from: string, dayOfMonth: number, n: number): string[] {
  const [y, m] = dueDateOnOrAfter(from, dayOfMonth).split("-").map(Number);
  return Array.from({ length: n }, (_, i) =>
    salaryDateOf(y + Math.floor((m - 1 + i) / 12), ((m - 1 + i) % 12) + 1, dayOfMonth),
  );
}

/**
 * Hạn tới của hoá đơn sau khi trả (cùng quy tắc fn_bill_next_due): lần đầu tiên trong chuỗi
 * hạn + k × chu kỳ nằm SAU max(hạn hiện tại, ngày trả), giữ ngày trong tháng.
 */
export function nextBillDueAfter(
  due: string,
  paidOn: string,
  dayOfMonth: number,
  intervalMonths = 1,
): string {
  const base = due > paidOn ? due : paidOn;
  const [dy, dm] = due.split("-").map(Number);
  const [by, bm] = base.split("-").map(Number);
  const k0 = Math.floor(((by - dy) * 12 + (bm - dm)) / intervalMonths);
  const at = (k: number) => {
    const total = dm - 1 + k * intervalMonths;
    return salaryDateOf(dy + Math.floor(total / 12), (total % 12) + 1, dayOfMonth);
  };
  const candidate = at(k0);
  return candidate > base ? candidate : at(k0 + 1);
}

export function roundUp(n: number, step = PER_PERIOD_STEP): number {
  return Math.ceil(n / step) * step;
}

export function perPeriodNeeded(remaining: number, periods: number): number {
  if (remaining <= 0) return 0;
  if (periods <= 0) return remaining;
  return roundUp(remaining / periods);
}

export type GoalPlanInput = {
  target: number;
  contributed: number;
  deadline: string | null;
  today: string;
  salaryDay: number;
  /** Số góp mỗi kỳ người dùng đặt (tự động góp); 0 = chưa đặt. */
  contribution: number;
  /** Thu nhập mỗi kỳ (lương) để tính tỷ lệ; 0 = không biết. */
  salary: number;
  /** Các khoản đã tự động chuyển đi mỗi kỳ (không tính quỹ đang sửa). */
  otherCommitments: number;
};

export type GoalPlan = {
  remaining: number;
  periods: number;
  perPeriod: number | null;
  /** Số tiền dùng để dự báo: số người dùng đặt, nếu chưa đặt thì số cần góp. */
  effectiveContribution: number;
  pctOfSalary: number | null;
  leftAfterCommitments: number | null;
  reachDate: string | null;
  onTime: boolean | null;
  periodsToReach: number | null;
};

export function planGoal(i: GoalPlanInput): GoalPlan {
  const remaining = Math.max(i.target - i.contributed, 0);
  const periods = payPeriods(i.today, i.deadline, i.salaryDay);
  const perPeriod = i.deadline ? perPeriodNeeded(remaining, periods) : null;
  const effective = i.contribution > 0 ? i.contribution : (perPeriod ?? 0);
  const periodsToReach =
    i.target <= 0
      ? null
      : remaining === 0
        ? 0
        : effective > 0
          ? Math.ceil(remaining / effective)
          : null;
  const reachDate =
    periodsToReach === null
      ? null
      : periodsToReach === 0
        ? i.today
        : nthSalaryDateAfter(i.today, i.salaryDay, periodsToReach);
  return {
    remaining,
    periods,
    perPeriod,
    effectiveContribution: effective,
    pctOfSalary: i.salary > 0 ? Math.round((effective * 100) / i.salary) : null,
    leftAfterCommitments: i.salary > 0 ? i.salary - i.otherCommitments - effective : null,
    reachDate,
    onTime: reachDate && i.deadline ? reachDate < i.deadline : null,
    periodsToReach,
  };
}

export type Scenario =
  | { kind: "keep"; perPeriod: number; projected: number; pct: number }
  | { kind: "increase"; perPeriod: number; projected: number; pct: number }
  | { kind: "lower"; perPeriod: number; target: number; projected: number; pct: number };

/** Ba kịch bản dự báo đến hạn: giữ đà hiện tại, tăng mức góp cho đủ, hạ mục tiêu. */
export function forecastScenarios(i: {
  target: number;
  contributed: number;
  periods: number;
  pace: number;
  perPeriod: number;
}): Scenario[] {
  const pctOf = (projected: number, target: number) =>
    Math.min(100, Math.round((projected * 100) / target));
  const projectedKeep = i.contributed + i.pace * i.periods;
  const list: Scenario[] = [
    {
      kind: "keep",
      perPeriod: i.pace,
      projected: projectedKeep,
      pct: pctOf(projectedKeep, i.target),
    },
    {
      kind: "increase",
      perPeriod: i.perPeriod,
      projected: Math.max(i.target, i.contributed + i.perPeriod * i.periods),
      pct: 100,
    },
  ];
  if (projectedKeep < i.target) {
    const lowered = Math.min(i.target, Math.max(roundUp(projectedKeep, 1_000_000), 1_000_000));
    if (lowered < i.target) {
      list.push({
        kind: "lower",
        perPeriod: i.pace,
        target: lowered,
        projected: projectedKeep,
        pct: pctOf(projectedKeep, lowered),
      });
    }
  }
  return list;
}

export { daysBetween };
