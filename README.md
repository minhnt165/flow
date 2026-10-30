# Flow

Web app quản lý cá nhân (chi tiêu, quỹ, mục tiêu quỹ, countdown ngày quan trọng, nhắc qua Telegram) cho một người dùng Việt Nam. Chạy tốt trên desktop và điện thoại, cài được như PWA.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · TanStack Query · Zustand · Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron) · Vitest · Playwright.

## Chạy local

```powershell
$env:NODE_OPTIONS="--use-system-ca"   # chỉ cần trên mạng công ty có proxy TLS
pnpm install
Copy-Item .env.local.example .env.local   # điền giá trị, xem docs/SETUP.md
pnpm dev                                   # http://localhost:3000
```

Chưa có Supabase thì trang đăng nhập vẫn mở được và hiện cảnh báo thiếu cấu hình. Các bước tạo project Supabase, Google OAuth và bot Telegram nằm trong [docs/SETUP.md](docs/SETUP.md).

## Lệnh

| Lệnh             | Việc                                                          |
| ---------------- | ------------------------------------------------------------- |
| `pnpm dev`       | Dev server (Turbopack)                                        |
| `pnpm build`     | Build production                                              |
| `pnpm lint`      | ESLint                                                        |
| `pnpm typecheck` | TypeScript                                                    |
| `pnpm test`      | Vitest: định dạng tiền, parser tin nhắn, test SQL (PGlite)    |
| `pnpm test:e2e`  | Playwright (cần Supabase thật, xem mục E2E)                   |
| `pnpm db:push`   | Đẩy `supabase/migrations` lên project đã link                 |
| `pnpm db:types`  | Sinh type từ schema thật vào `lib/supabase/database.types.ts` |

## Biến môi trường

| Biến                                | Ở đâu                                  | Ghi chú                                         |
| ----------------------------------- | -------------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | `.env.local`, Vercel                   | `https://<ref>.supabase.co`                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | `.env.local`, Vercel                   | anon hoặc publishable key                       |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | `.env.local`, Vercel                   | username bot, không có `@`                      |
| `NEXT_PUBLIC_SITE_URL`              | `.env.local`, Vercel                   | URL gốc của web                                 |
| `TELEGRAM_BOT_TOKEN`                | Supabase secrets                       | token từ BotFather                              |
| `TELEGRAM_WEBHOOK_SECRET`           | Supabase secrets                       | so với header `X-Telegram-Bot-Api-Secret-Token` |
| `CRON_SECRET`                       | Supabase secrets + Vault `cron_secret` | pg_cron gửi kèm khi gọi job                     |
| `APP_URL`                           | Supabase secrets                       | link trong tin nhắn bot                         |

Không đặt service role key, bot token hay secret nào trong `.env.local` hoặc commit lên git.

## Cấu trúc

```
app/                  Route Next.js: (auth) đăng nhập, (app) các module sau đăng nhập
components/           ui/ (shadcn đã tuỳ biến), layout/, common/, theo module
lib/supabase/         Mọi truy vấn Supabase, mỗi bảng một file
messages/vi.ts        Mọi chuỗi giao diện
supabase/migrations/  Schema, RLS, view, function (mọi thay đổi schema là migration)
supabase/functions/   Edge Functions; _shared/ là code thuần dùng chung với web và test
docs/SETUP.md         Checklist setup Supabase, Google OAuth, Telegram
design/               File thiết kế tham chiếu
```
