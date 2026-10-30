"use client";

import { t } from "@/messages/vi";
import "./globals.css";

// Lỗi ở chính root layout: tự dựng html/body tối giản.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="vi">
      <body className="flex min-h-dvh items-center justify-center bg-bg p-6 text-text">
        <div className="flex max-w-sm flex-col gap-4 card p-7">
          <h1 className="m-0 text-xl font-semibold">{t.errors.title}</h1>
          <p className="m-0 text-sm text-muted-foreground">{t.errors.body}</p>
          <button
            type="button"
            onClick={reset}
            className="min-h-12 cursor-pointer rounded-[14px] border-0 bg-accent font-semibold text-bg"
          >
            {t.errors.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
