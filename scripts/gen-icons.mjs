// Sinh icon PWA / apple-touch từ mark của Flow (render SVG bằng Chromium của Playwright).
// Dùng: node scripts/gen-icons.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const mark = (
  size,
  { padding = 0, radius = 16, bg = "#D4F04A", fg = "#0E0F14", canvas = null } = {},
) => {
  const inner = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${canvas ? `<rect width="${size}" height="${size}" fill="${canvas}"/>` : ""}
  <g transform="translate(${padding} ${padding}) scale(${inner / 64})">
    <rect width="64" height="64" rx="${radius}" fill="${bg}"/>
    <polyline points="12,36 22,36 28,22 36,46 42,32 52,32" fill="none" stroke="${fg}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g></svg>`;
};

const OUT = [
  { file: "public/icons/icon-192.png", size: 192, svg: mark(192) },
  { file: "public/icons/icon-512.png", size: 512, svg: mark(512) },
  // Maskable: nền tràn viền, mark nằm trong vùng an toàn 80%.
  {
    file: "public/icons/maskable-512.png",
    size: 512,
    svg: mark(512, { padding: 72, radius: 16, canvas: "#D4F04A" }),
  },
  { file: "app/apple-icon.png", size: 180, svg: mark(180, { radius: 0 }) },
];

fs.mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const o of OUT) {
  await page.setViewportSize({ width: o.size, height: o.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${o.svg}</body></html>`,
  );
  await page.locator("svg").screenshot({ path: o.file, omitBackground: true });
  console.log("ok", o.file);
}
await browser.close();
