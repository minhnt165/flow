import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { t } from "@/messages/vi";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: t.app.name, template: `%s · ${t.app.name}` },
  description: t.app.tagline,
  applicationName: t.app.name,
  appleWebApp: { capable: true, title: t.app.name, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0E0F14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Bàn phím ảo thu nhỏ viewport (Android) để thanh nút Lưu dính đáy không bị che.
  interactiveWidget: "resizes-content",
};

// Font dùng ngay ở màn đầu (chữ thường + số tiền lớn): tải sớm để giảm LCP.
const PRELOAD_FONTS = [
  "/fonts/be-vietnam-pro-latin-400-normal.woff2",
  "/fonts/be-vietnam-pro-vietnamese-400-normal.woff2",
  "/fonts/space-grotesk-latin-700-normal.woff2",
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  PRELOAD_FONTS.forEach((href) =>
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" }),
  );
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
