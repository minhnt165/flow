import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Nhúng CSS vào <head> thay vì file riêng: bỏ request chặn render (Lighthouse mobile).
    inlineCss: true,
    // Mọi trang đều dynamic (layout kiểm tra phiên) nhưng dữ liệu nằm ở React Query phía client,
    // nên giữ RSC của tab đã mở trong router cache để chuyển qua lại không phải gọi server.
    staleTimes: { dynamic: 180, static: 300 },
  },
};

export default nextConfig;
