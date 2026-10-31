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

// Monochrome (Android 13+ themed icon): chỉ giữ hình dạng, hệ thống tự tô màu theo wallpaper.
const monoMark = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${size * 0.1} ${size * 0.1}) scale(${(size * 0.8) / 64})">
    <polyline points="12,36 22,36 28,22 36,46 42,32 52,32" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g></svg>`;

const OUT = [
  { file: "public/icons/icon-192.png", size: 192, svg: mark(192) },
  { file: "public/icons/icon-512.png", size: 512, svg: mark(512) },
  // Maskable: nền tràn viền, mark nằm trong vùng an toàn 80%.
  {
    file: "public/icons/maskable-192.png",
    size: 192,
    svg: mark(192, { padding: 27, radius: 16, canvas: "#D4F04A" }),
  },
  {
    file: "public/icons/maskable-512.png",
    size: 512,
    svg: mark(512, { padding: 72, radius: 16, canvas: "#D4F04A" }),
  },
  { file: "public/icons/monochrome-512.png", size: 512, svg: monoMark(512) },
  { file: "app/apple-icon.png", size: 180, svg: mark(180, { radius: 0 }) },
];

// favicon.ico: Safari (không hỗ trợ favicon SVG), Windows pin / bookmark cũ. Gồm 3 cỡ PNG đóng gói ICO.
const ICO_SIZES = [16, 32, 48];

// ICO chứa PNG nguyên bản (Vista+ hỗ trợ): header 6 byte + 16 byte/entry + dữ liệu PNG nối tiếp.
const packIco = (pngs) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
};

fs.mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const render = async (size, svg, path) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  return page.locator("svg").screenshot({ path, omitBackground: true });
};
for (const o of OUT) {
  await render(o.size, o.svg, o.file);
  console.log("ok", o.file);
}
const icoPngs = [];
for (const size of ICO_SIZES) {
  icoPngs.push({ size, data: await render(size, mark(size, { radius: 12 })) });
}
fs.writeFileSync("app/favicon.ico", packIco(icoPngs));
console.log("ok", "app/favicon.ico");
await browser.close();
