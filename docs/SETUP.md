# Setup Supabase và Telegram bot cho Flow

Checklist làm một lần trước khi chạy Flow với dữ liệu thật. Làm theo thứ tự; mỗi bước ghi rõ lấy giá trị gì và dán vào đâu.

> **Không dán token bot, service role key, mật khẩu DB vào chat hay commit.** Chỉ để trong `.env.local` (khoá public) và Supabase secrets (khoá bí mật).

## 0. Công cụ trên máy

| Công cụ        | Lệnh kiểm tra             | Ghi chú                                                                |
| -------------- | ------------------------- | ---------------------------------------------------------------------- |
| Node 20+       | `node -v`                 | Máy hiện có v24                                                        |
| pnpm 9         | `pnpm -v`                 | Đã cài: `npm i -g pnpm@9`                                              |
| Supabase CLI   | `pnpm supabase --version` | Có sẵn trong devDependencies, không cần cài global                     |
| Docker Desktop | `docker -v`               | Tuỳ chọn, chỉ cần khi muốn chạy Supabase local (`pnpm supabase start`) |

**Mạng công ty (FPT):** registry `hn-repo.fsoft.com.vn` chỉ vào được khi có VPN, và proxy chặn TLS bằng chứng chỉ riêng. Repo đã có `.npmrc` trỏ registry công khai. Mỗi phiên PowerShell, chạy trước:

```powershell
$env:NODE_OPTIONS="--use-system-ca"   # Node dùng kho chứng chỉ Windows, không cần tắt SSL
```

## 1. Tạo project Supabase

1. Vào https://supabase.com/dashboard và chọn **New project**:
   - Name: `flow`
   - Region: **Southeast Asia (Singapore)**
   - Database password: tạo mật khẩu mạnh và lưu vào password manager (lúc `link` sẽ cần).
2. Vào **Project Settings → API**, ghi lại:
   - `Project URL`: `https://<ref>.supabase.co`. `<ref>` là **project ref**.
   - Khoá **anon / publishable**: dán vào `.env.local`.
   - Khoá **service_role / secret**: **không** dán vào đâu cả. Edge Functions tự có sẵn khoá này.
3. Vào **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (sau khi deploy thì đổi sang domain Vercel).
   - Redirect URLs: thêm `http://localhost:3000/auth/callback`. Khi deploy, thêm `https://<domain>/auth/callback`.
4. Vào **Authentication → Providers → Email**: để bật. Magic link đi chung với provider này.
   - SMTP mặc định chỉ gửi được vài email mỗi giờ, đủ để test. Khi dùng thật nên gắn SMTP riêng (Resend, Brevo…) ở **Authentication → SMTP Settings**.
5. **Không bật extension bằng tay.** `pg_cron`, `pg_net` và vault được bật trong migration.

## 2. Google OAuth

1. Vào https://console.cloud.google.com và tạo project `flow`.
2. **APIs & Services → OAuth consent screen**:
   - Chọn External, App name `Flow`, điền email của bạn.
   - Ở **Test users**, thêm email Google của bạn.
3. **Credentials → Create credentials → OAuth client ID**:
   - Loại: **Web application**.
   - Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`
4. Copy **Client ID** và **Client Secret**, vào Supabase **Authentication → Providers → Google**: bật lên và dán hai giá trị đó.

## 3. Tạo bot Telegram

1. Mở Telegram, chat với **@BotFather** và gõ `/newbot`:
   - Name: `Flow`
   - Username: bắt buộc kết thúc bằng `bot`, ví dụ `flow_minh_bot`. `flow_bot` gần như chắc chắn đã có người dùng.
   - BotFather trả về **token** dạng `123456789:AA...`. Cất token này kỹ.
2. Gõ `/setcommands`, chọn bot rồi gửi:
   ```
   start - Kết nối tài khoản Flow
   stop - Ngắt kết nối
   help - Cách ghi chi tiêu
   ```
3. Gõ `/setdescription`, nhập: `Ghi chi tiêu và nhận nhắc nhở từ Flow.`
4. Gõ `/setuserpic`, gửi file `public/icons/icon-512.png` trong repo.
5. Tạo **webhook secret** (chuỗi ngẫu nhiên, dùng cho header `X-Telegram-Bot-Api-Secret-Token`) và **cron secret** (dùng cho job theo lịch):
   ```powershell
   -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | % {[char]$_})
   ```
   Chạy hai lần, lưu hai chuỗi khác nhau.

## 4. Điền `.env.local`

```powershell
Copy-Item .env.local.example .env.local
```

Mở `.env.local` và điền:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon hoặc sb_publishable_...>
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=<username bot, không có @>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 5. Đẩy schema và secrets lên Supabase

```powershell
$env:NODE_OPTIONS="--use-system-ca"
pnpm supabase login                          # mở trình duyệt, đăng nhập một lần
pnpm supabase link --project-ref <ref>       # hỏi mật khẩu DB ở bước 1
pnpm supabase db push                        # chạy toàn bộ supabase/migrations

pnpm supabase secrets set `
  TELEGRAM_BOT_TOKEN=<token BotFather> `
  TELEGRAM_WEBHOOK_SECRET=<webhook secret> `
  CRON_SECRET=<cron secret> `
  APP_URL=http://localhost:3000
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` đã có sẵn trong Edge Functions, không cần set.

Tiếp theo, cho pg_cron biết URL project và cron secret. Vào **SQL Editor** trên dashboard, chạy (thay giá trị thật):

```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<cron secret>', 'cron_secret');
```

## 6. Deploy Edge Functions và đăng ký webhook

```powershell
pnpm supabase functions deploy telegram-webhook --no-verify-jwt
pnpm supabase functions deploy notify-daily --no-verify-jwt
pnpm supabase functions deploy notify-evening --no-verify-jwt
pnpm supabase functions deploy run-recurring --no-verify-jwt
pnpm supabase functions deploy telegram-test

curl.exe -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" `
  -d "url=https://<ref>.supabase.co/functions/v1/telegram-webhook" `
  -d "secret_token=<webhook secret>" `
  -d "allowed_updates=[\"message\",\"callback_query\"]"

curl.exe "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"   # kiểm tra: url đúng, last_error_message trống
```

Bốn function đầu tắt JWT vì Telegram và pg_cron không gửi JWT; chúng tự kiểm tra secret header. `telegram-test` giữ JWT vì được gọi từ web khi người dùng đã đăng nhập.

## 7. Chạy thử

```powershell
pnpm dev     # http://localhost:3000
```

1. Đăng ký, hoặc đăng nhập bằng Google. Lần đầu vào, app hỏi ngày nhận lương.
2. Vào **Cài đặt → Thông báo → Kết nối Telegram**, bấm **Mở Telegram**, rồi bấm **Start** trong bot.
3. Nhắn cho bot `65k cơm trưa`: giao dịch phải hiện trên web trong vài giây.

## 8. Deploy Vercel (khi sẵn sàng)

1. Import repo `minhnt165/flow` trên Vercel. Framework: Next.js; build command mặc định.
2. Environment Variables: nhập 4 biến như trong `.env.local`, với `NEXT_PUBLIC_SITE_URL=https://<domain>`.
3. Cập nhật lại các URL:
   - Supabase → Authentication → URL Configuration: Site URL và Redirect URLs dùng domain Vercel.
   - `pnpm supabase secrets set APP_URL=https://<domain>`: link trong tin nhắn bot trỏ về web.

## Rủi ro cần biết

- Gói Free của Supabase **tạm dừng project sau khoảng 7 ngày không có request**. Khi project bị dừng, job cron cũng ngừng và bot sẽ không nhắc. Dùng hằng ngày thì thường không sao.
- Thời gian gửi job: sáng 08:00, chạy tự động góp 06:00, tổng kết tối kiểm tra mỗi 15 phút (theo `daily_summary_at` của từng người).
