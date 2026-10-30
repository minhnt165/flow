"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { addMonths, APP_TZ, localDate, monthStart, toIso } from "@/lib/dates";

/** Tháng đang xem (?month=YYYY-MM, mặc định tháng hiện tại theo giờ VN) và khoảng thời gian ISO. */
export function useMonth() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = monthStart(localDate(new Date(), APP_TZ));
  const raw = params.get("month");
  const month = raw && /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : current;

  const range = useMemo(
    () => ({ from: toIso(month, "00:00"), to: toIso(addMonths(month, 1), "00:00") }),
    [month],
  );

  const setMonth = useCallback(
    (m: string) => {
      const next = new URLSearchParams(params.toString());
      if (m === current) next.delete("month");
      else next.set("month", m.slice(0, 7));
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, router, pathname, current],
  );

  return { month, current, isCurrent: month === current, range, setMonth };
}
