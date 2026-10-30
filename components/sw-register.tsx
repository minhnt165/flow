"use client";

import { useEffect } from "react";

// Đăng ký service worker ở bản production (dev không cache để tránh dữ liệu cũ).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* trình duyệt không hỗ trợ / chặn: app vẫn chạy bình thường */
    });
  }, []);
  return null;
}
