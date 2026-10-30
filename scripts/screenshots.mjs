// Chụp màn hình các trang chính ở chế độ demo để so với thiết kế tham chiếu.
// Dùng: pnpm dev:demo (cổng 3001) rồi `node scripts/screenshots.mjs [thư-mục-ra] [tên-trang...]`.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const out = process.argv[2] ?? "screenshots";
const only = process.argv.slice(3);
fs.mkdirSync(out, { recursive: true });

const SHOTS = [
  { name: "login", path: "/login" },
  { name: "expenses", path: "/expenses" },
  { name: "expenses-add", path: "/expenses", action: async (p) => p.keyboard.press("n") },
  {
    name: "transfer",
    path: "/expenses/funds",
    action: async (p) => {
      await p.keyboard.press("n");
      await p.waitForTimeout(400);
      await p.getByRole("radio", { name: "Chuyển quỹ" }).click();
    },
  },
  { name: "funds", path: "/expenses/funds" },
  {
    name: "fund-create",
    path: "/expenses/funds",
    action: async (p) => p.getByRole("button", { name: "Tạo quỹ mới" }).click(),
  },
  {
    name: "goal",
    path: "/expenses/funds",
    action: async (p) => p.getByRole("link", { name: /Quỹ Tết/ }).click(),
  },
  { name: "transactions", path: "/expenses/transactions" },
  { name: "countdowns", path: "/countdowns" },
  {
    name: "countdown-add",
    path: "/countdowns",
    action: async (p) => p.getByRole("button", { name: "Thêm sự kiện" }).first().click(),
  },
  { name: "settings", path: "/settings?tab=notifications" },
  { name: "home", path: "/" },
];

const VIEWPORTS = [
  { tag: "desktop", width: 1280, height: 844 },
  { tag: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`${m.text()}`));
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const s of SHOTS) {
    if (only.length && !only.includes(s.name)) continue;
    try {
      await page.goto(BASE + s.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      if (s.action) {
        await s.action(page);
        await page.waitForTimeout(900);
      }
      const file = path.join(out, `${s.name}-${vp.tag}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log("ok", file);
    } catch (e) {
      console.log("fail", s.name, vp.tag, String(e).split("\n")[0]);
    }
  }
  if (errors.length) console.log(`console errors (${vp.tag}):\n` + [...new Set(errors)].join("\n"));
  await ctx.close();
}
await browser.close();
