import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Nhúng CSS vào <head> thay vì file riêng: bỏ request chặn render (Lighthouse mobile).
    inlineCss: true,
  },
};

export default nextConfig;
