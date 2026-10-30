// Chép font cần dùng từ @fontsource vào public/fonts và sinh app/fonts.css với đường dẫn tuyệt đối /fonts/...
// (CSS được nhúng vào <head>, nên url() không được phụ thuộc vào đường dẫn bundler đổi tên).
// Dùng: node scripts/copy-fonts.mjs
import fs from "node:fs";
import path from "node:path";

const FONTS = [
  { pkg: "be-vietnam-pro", weights: [400, 500, 600] },
  { pkg: "space-grotesk", weights: [500, 700] },
];
const SUBSETS = ["vietnamese", "latin-ext", "latin"];

fs.mkdirSync("public/fonts", { recursive: true });
const blocks = ["/* Sinh bởi scripts/copy-fonts.mjs – không sửa tay. */"];
for (const { pkg, weights } of FONTS) {
  for (const w of weights) {
    const dir = path.join("node_modules", "@fontsource", pkg);
    const css = fs.readFileSync(path.join(dir, `${w}.css`), "utf8");
    for (const face of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
      const body = face[1];
      const file = body.match(/url\(\.\/files\/([^)]+\.woff2)\)/)?.[1];
      const subset = SUBSETS.find((s) => file?.startsWith(`${pkg}-${s}-${w}-`));
      if (!file || !subset) continue;
      const family = body.match(/font-family:\s*'([^']+)'/)[1];
      const range = body.match(/unicode-range:\s*([^;]+);/)?.[1];
      fs.copyFileSync(path.join(dir, "files", file), path.join("public/fonts", file));
      blocks.push(
        [
          "@font-face {",
          `  font-family: "${family}";`,
          "  font-style: normal;",
          "  font-display: swap;",
          `  font-weight: ${w};`,
          `  src: url("/fonts/${file}") format("woff2");`,
          range ? `  unicode-range: ${range};` : null,
          "}",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }
}
fs.writeFileSync("app/fonts.css", blocks.join("\n\n") + "\n");
console.log("ok", blocks.length - 1, "font faces");
