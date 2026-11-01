# Flow

Web app quản lý cá nhân cho một người dùng Việt Nam: chi tiêu, quỹ, mục tiêu quỹ, hoá đơn định kỳ, countdown ngày quan trọng, việc cần làm, thói quen, ghi chú và nhắc qua Telegram. Chạy tốt trên desktop và điện thoại, cài được như PWA.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · TanStack Query · Zustand · Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron) · Vitest · Playwright.

## Chạy local

```powershell
$env:NODE_OPTIONS="--use-system-ca"   # cho pnpm install trên mạng có proxy TLS; pnpm dev/start đã tự đặt
pnpm install
Copy-Item .env.local.example .env.local   # điền giá trị, xem docs/SETUP.md
pnpm dev                                   # http://localhost:3000
```

Các bước tạo project Supabase, Google OAuth và bot Telegram nằm trong [docs/SETUP.md](docs/SETUP.md).

### Xem thử không cần Supabase

```powershell
pnpm dev:demo   # http://localhost:3001
```

Chế độ demo (`NEXT_PUBLIC_DEMO_MODE=1`) thay client Supabase bằng kho dữ liệu mẫu trong bộ nhớ. Số dư, ngân sách và tiến độ được tính lại theo cùng quy tắc với view SQL. Chế độ này bỏ qua đăng nhập, dữ liệu mất khi tải lại trang và chỉ dùng để xem UI hoặc chạy E2E. **Không bật biến này khi deploy.**

## Lệnh

| Lệnh                           | Việc                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:demo`   | Dev server (Turbopack) với Supabase thật / dữ liệu demo                                |
| `pnpm build`                   | Build production                                                                       |
| `pnpm lint` · `pnpm typecheck` | ESLint · TypeScript                                                                    |
| `pnpm test`                    | Vitest: tiền tệ, ngày giờ, parser tin nhắn, kế hoạch quỹ, CSV, test SQL                |
| `pnpm test:e2e`                | Playwright: thêm chi tiêu, chuyển quỹ, quỹ mục tiêu, hoá đơn, việc, thói quen, ghi chú |
| `pnpm db:push`                 | Đẩy `supabase/migrations` lên project đã link                                          |
| `pnpm db:types`                | Sinh type từ schema thật vào `lib/supabase/database.types.ts`                          |
| `pnpm functions:bundle`        | Gộp mỗi Edge Function thành một file để dán vào Supabase Dashboard                     |
| `node scripts/screenshots.mjs` | Chụp các trang chính (desktop + mobile) từ `dev:demo` để so với thiết kế               |
| `node scripts/gen-icons.mjs`   | Sinh lại icon PWA / apple-touch từ logo                                                |

### Test SQL

`supabase/tests/*.test.ts` chạy **toàn bộ migration thật** trên Postgres nhúng (PGlite, không cần Docker). Bộ test dùng một lớp giả lập tối thiểu của Supabase: role `anon` / `authenticated` / `service_role`, `auth.users`, `auth.uid()`. Test kiểm tra số dư quỹ, ngân sách tháng theo giờ VN, tổng chi theo tháng, tiến độ mục tiêu, countdown lặp theo chu kỳ tháng, hoá đơn định kỳ (hạn tới, đánh dấu đã trả), việc cần làm (hạn theo giờ người dùng), thói quen (chuỗi ngày, số ngày trong tuần), ghi chú (updated_at), RLS, job tự động góp, liên kết Telegram và thông báo. Migration nào cần pg_cron / Vault thì đánh dấu `-- pglite:skip`.

### E2E

- Mặc định `pnpm test:e2e` tự bật `dev:demo` và chạy trên desktop + mobile (Pixel 7).
- Chạy với backend thật:

```powershell
$env:E2E_BASE_URL="http://localhost:3000"; $env:E2E_EMAIL="..."; $env:E2E_PASSWORD="..."; pnpm test:e2e
```

## Biến môi trường

| Biến                                | Ở đâu                                  | Ghi chú                                         |
| ----------------------------------- | -------------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | `.env.local`, Vercel                   | `https://<ref>.supabase.co`                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | `.env.local`, Vercel                   | anon hoặc publishable key                       |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | `.env.local`, Vercel                   | username bot, không có `@`                      |
| `NEXT_PUBLIC_SITE_URL`              | `.env.local`, Vercel                   | URL gốc của web                                 |
| `TELEGRAM_BOT_TOKEN`                | Supabase secrets                       | token từ BotFather                              |
| `TELEGRAM_WEBHOOK_SECRET`           | Supabase secrets                       | so với header `X-Telegram-Bot-Api-Secret-Token` |
| `CRON_SECRET`                       | Supabase secrets + Vault `cron_secret` | pg_cron gửi kèm header `x-cron-secret`          |

Không đặt service role key, bot token hay secret nào trong `.env.local` hoặc commit lên git.

## Deploy

Không dùng được Supabase CLI (ví dụ trên mạng công ty) thì làm toàn bộ trên Dashboard theo [docs/SETUP.md](docs/SETUP.md) mục 5–6. Cách này dùng SQL Editor cho migration và `pnpm functions:bundle` để có file dán vào editor Edge Functions. Các lệnh dưới đây là cách làm bằng CLI.

### Database

```powershell
pnpm supabase link --project-ref <ref>
pnpm supabase db push
```

Sau lần push đầu, tạo hai secret trong Vault để pg_cron gọi được Edge Functions:

```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<cron secret>', 'cron_secret');
```

### Edge Functions

```powershell
pnpm supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... CRON_SECRET=...
pnpm supabase functions deploy telegram-webhook --no-verify-jwt
pnpm supabase functions deploy notify-daily --no-verify-jwt
pnpm supabase functions deploy notify-evening --no-verify-jwt
pnpm supabase functions deploy run-recurring --no-verify-jwt
pnpm supabase functions deploy telegram-test
```

### Đăng ký webhook Telegram

```powershell
curl.exe -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" `
  -d "url=https://<ref>.supabase.co/functions/v1/telegram-webhook" `
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" `
  -d "allowed_updates=[\"message\",\"callback_query\"]"
curl.exe "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Lịch job (pg_cron, giờ Việt Nam)

| Job              | Cron (UTC)     | Giờ VN          | Việc                                                         |
| ---------------- | -------------- | --------------- | ------------------------------------------------------------ |
| `run-recurring`  | `0 23 * * *`   | 06:00           | Tự động góp sau lương / chuyển định kỳ, báo Telegram         |
| `notify-daily`   | `0 1 * * *`    | 08:00           | Countdown, hoá đơn, ngân sách 80% / 100%, quỹ mục tiêu chậm  |
| `notify-evening` | `*/15 * * * *` | theo người dùng | Tổng kết chi hôm nay lúc `daily_summary_at` (mặc định 21:00) |
|                  |                |                 | Nhắc ghi chi tiêu lúc `expense_reminder_at` (mặc định 20:00) |

### Web (Vercel)

Import repo, nhập 4 biến `NEXT_PUBLIC_*`, deploy. Sau đó thêm `https://<domain>/auth/callback` vào Supabase → Authentication → Redirect URLs.

## Cấu trúc

```
app/                  Route Next.js: (auth) đăng nhập, (app) các module sau đăng nhập, onboarding
components/           ui/ (shadcn đã tuỳ biến), layout/, common/, expenses/, bills/, countdowns/, todos/, habits/, notes/, settings/, home/
hooks/                Hook TanStack Query, mỗi domain một file
lib/supabase/         Mọi truy vấn Supabase, mỗi bảng một file
lib/demo/             Dữ liệu mẫu + client giả cho chế độ demo
messages/vi.ts        Mọi chuỗi giao diện
stores/ui.ts          Zustand: trạng thái hộp thoại
supabase/migrations/  Schema, RLS, view, function, pg_cron (mọi thay đổi schema là migration)
supabase/functions/   Edge Functions; _shared/ là code thuần dùng chung với web và test, _lib/ là phần chỉ chạy trên Deno
supabase/tests/       Test SQL trên PGlite
tests/e2e/            Playwright
docs/SETUP.md         Checklist setup Supabase, Google OAuth, Telegram
design/               File thiết kế tham chiếu
```
