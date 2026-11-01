import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Version tự sinh mỗi lần build: thời điểm build theo giờ VN (YYYY.MM.DD-HHmm) + commit ngắn,
// để biết app trên điện thoại đang chạy bản deploy nào mà không phải tăng số bằng tay.
function buildVersion() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}.${p.month}.${p.day}-${p.hour}${p.minute}`;
}

function buildCommit() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: buildVersion(),
    NEXT_PUBLIC_APP_COMMIT: buildCommit(),
  },
  experimental: {
    // Nhúng CSS vào <head> thay vì file riêng: bỏ request chặn render (Lighthouse mobile).
    inlineCss: true,
    // Mọi trang đều dynamic (layout kiểm tra phiên) nhưng dữ liệu nằm ở React Query phía client,
    // nên giữ RSC của tab đã mở trong router cache để chuyển qua lại không phải gọi server.
    staleTimes: { dynamic: 180, static: 300 },
  },
};

export default nextConfig;
