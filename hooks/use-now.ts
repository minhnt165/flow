"use client";

import { useEffect, useState } from "react";

/** Thời điểm hiện tại, cập nhật mỗi `intervalMs` (mặc định 1 phút) để nhãn "x phút trước" không cũ đi. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
