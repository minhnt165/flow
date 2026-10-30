// Gộp mỗi Edge Function (index.ts + _shared + _lib) thành một file, để dán vào editor trên
// Supabase Dashboard khi không dùng được Supabase CLI. Chạy offline, không gọi mạng.
// Dùng: node scripts/bundle-functions.mjs  →  supabase/functions-dist/<tên>.ts
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const SRC = "supabase/functions";
const OUT = "supabase/functions-dist";
const names = fs
  .readdirSync(SRC)
  .filter((n) => !n.startsWith("_") && fs.existsSync(path.join(SRC, n, "index.ts")));

fs.rmSync(OUT, { recursive: true, force: true });
for (const name of names) {
  const outfile = path.join(OUT, `${name}.ts`);
  await build({
    entryPoints: [path.join(SRC, name, "index.ts")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    charset: "utf8",
    // Deno tự tải các import này lúc chạy.
    external: ["npm:*", "jsr:*", "https://*"],
    banner: {
      // Đầu ra là JS đã bỏ kiểu; đã kiểm tra kiểu ở mã nguồn (deno check).
      js: `// Sinh bởi scripts/bundle-functions.mjs từ ${SRC}/${name} – không sửa tay.\n// @ts-nocheck`,
    },
  });
  console.log("ok", outfile);
}
