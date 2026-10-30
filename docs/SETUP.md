# Setup Supabase và Telegram bot cho Flow

Checklist làm một lần trước khi chạy Flow với dữ liệu thật. Làm theo thứ tự; mỗi bước ghi rõ lấy giá trị gì và dán vào đâu.

Mọi thao tác với Supabase đều làm trên **Dashboard** (trình duyệt). Hướng dẫn này không cần Supabase CLI, vì trên mạng công ty CLI không kết nối được.

> **Không dán token bot, service role key, mật khẩu DB vào chat hay commit.** Chỉ để trong `.env.local` (khoá public) và Supabase secrets (khoá bí mật).

## 0. Công cụ trên máy

| Công cụ  | Lệnh kiểm tra | Ghi chú                   |
| -------- | ------------- | ------------------------- |
| Node 20+ | `node -v`     | Máy hiện có v24           |
| pnpm 9   | `pnpm -v`     | Đã cài: `npm i -g pnpm@9` |

**Mạng công ty (FPT):** registry `hn-repo.fsoft.com.vn` chỉ vào được khi có VPN, và proxy chặn TLS bằng chứng chỉ riêng. Repo đã có `.npmrc` trỏ registry công khai. Trước khi chạy `pnpm install`, đặt biến sau (các lệnh `pnpm dev`/`pnpm start` đã tự đặt):

```powershell
$env:NODE_OPTIONS="--use-system-ca"   # Node dùng kho chứng chỉ Windows, không cần tắt SSL
```

## 1. Tạo project Supabase

1. Vào https://supabase.com/dashboard và chọn **New project**:
   - Name: `flow`
   - Region: **Southeast Asia (Singapore)**
   - Database password: tạo mật khẩu mạnh và lưu vào password manager.
2. Vào **Project Settings → API**, ghi lại:
   - `Project URL`: `https://<ref>.supabase.co`. `<ref>` là **project ref**.
   - Khoá **anon / publishable**: dán vào `.env.local`.
   - Khoá **service_role / secret**: **không** dán vào đâu cả. Edge Functions tự có sẵn khoá này.
3. Vào **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (sau khi deploy thì đổi sang domain Vercel).
   - Redirect URLs: thêm `http://localhost:3000/auth/callback`. Khi deploy, thêm `https://<domain>/auth/callback`.
4. Vào **Authentication → Providers → Email**: để bật. Magic link đi chung với provider này.
   - SMTP mặc định chỉ gửi được vài email mỗi giờ, đủ để test. Khi dùng thật nên gắn SMTP riêng (Resend, Brevo…) ở **Authentication → SMTP Settings**.
   - Không bắt buộc: để link trong email mở được trên trình duyệt hoặc máy khác, vào **Authentication → Emails → Templates** và đổi đường link:
     - Confirm signup và Magic link: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`
     - Reset password: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`

     Nếu giữ mẫu mặc định (`{{ .ConfirmationURL }}`), bạn phải mở link trên đúng trình duyệt đã bấm đăng nhập hoặc đăng ký.
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

## 5. Chạy migration và tạo secrets (Dashboard)

### 5.1. Migration bằng SQL Editor

Vào **SQL Editor → New query**. Mở lần lượt từng file trong `supabase/migrations`, **đúng thứ tự tên file**. Với mỗi file: copy toàn bộ nội dung, dán vào và bấm **Run**.

| #   | File                                    | Nội dung                                   |
| --- | --------------------------------------- | ------------------------------------------ |
| 1   | `20261030000100_profiles.sql`           | Bảng hồ sơ người dùng                      |
| 2   | `20261030000200_core_schema.sql`        | Quỹ, danh mục, giao dịch, countdown, RLS   |
| 3   | `20261030000300_views_functions.sql`    | View và hàm tính toán                      |
| 4   | `20261030000400_seed_defaults.sql`      | Danh mục và quỹ mặc định cho tài khoản mới |
| 5   | `20261030000500_cron_run_recurring.sql` | Bật pg_cron, pg_net; job tự góp quỹ        |
| 6   | `20261030000600_cron_notifications.sql` | Job nhắc sáng và tổng kết tối              |

- Mỗi file chỉ chạy **một lần**. Chạy lại sẽ báo lỗi kiểu `already exists`.
- Nếu một file báo lỗi giữa chừng, dừng lại, đừng chạy file tiếp theo. Chụp thông báo lỗi để xử lý.
- Kiểm tra: **Table Editor** phải có các bảng `profiles`, `funds`, `categories`, `transactions`, `countdowns`, `recurring_rules`. **Integrations → Cron** phải có 3 job: `run-recurring`, `notify-daily`, `notify-evening`.

### 5.2. Vault cho pg_cron

Vẫn ở **SQL Editor**, chạy câu sau (thay giá trị thật) để pg_cron biết URL project và cron secret:

```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<cron secret>', 'cron_secret');
```

### 5.3. Secrets cho Edge Functions

Vào **Edge Functions → Secrets** và thêm 3 secret:

| Name                      | Value                                                    |
| ------------------------- | -------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`      | token BotFather ở bước 3                                 |
| `TELEGRAM_WEBHOOK_SECRET` | webhook secret ở bước 3                                  |
| `CRON_SECRET`             | cron secret ở bước 3, **giống** giá trị đã đưa vào Vault |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` đã có sẵn trong Edge Functions, không cần thêm.

## 6. Deploy Edge Functions và đăng ký webhook (Dashboard)

### 6.1. Gộp code thành một file mỗi function

Editor trên Dashboard chỉ nhận một file cho mỗi function, nên code cần gộp lại trước. Lệnh này chạy offline:

```powershell
pnpm functions:bundle
```

Lệnh sinh 5 file trong `supabase/functions-dist/`. Thư mục này đã nằm trong `.gitignore`.

### 6.2. Tạo function

Làm lần lượt cho cả 5 file. Vào **Edge Functions → Deploy a new function → Via Editor**:

1. Đặt tên function **đúng bằng tên file**, không kèm `.ts`. Web và pg_cron gọi function theo tên này.
2. Xoá code mẫu, mở file tương ứng trong `supabase/functions-dist/`, copy toàn bộ và dán vào.
3. Bấm **Deploy function**.
4. Mở function vừa tạo, sang tab **Details** (hoặc **Settings**), chỉnh **Verify JWT** theo bảng rồi bấm **Save**:

| Function           | Verify JWT         | Vì sao                                                     |
| ------------------ | ------------------ | ---------------------------------------------------------- |
| `telegram-webhook` | **Tắt**            | Telegram không gửi JWT; function tự kiểm tra header secret |
| `notify-daily`     | **Tắt**            | pg_cron gọi bằng header `x-cron-secret`                    |
| `notify-evening`   | **Tắt**            | như trên                                                   |
| `run-recurring`    | **Tắt**            | như trên                                                   |
| `telegram-test`    | **Bật** (mặc định) | Gọi từ web khi người dùng đã đăng nhập                     |

Nếu quên tắt Verify JWT, bot sẽ không trả lời, vì Telegram nhận về `401`.

**Khi code function thay đổi** (sau khi `git pull`): chạy lại `pnpm functions:bundle`, mở function trên Dashboard → tab **Code**, dán đè nội dung mới và bấm **Deploy**.

### 6.3. Đăng ký webhook Telegram

Mở link sau trên trình duyệt (thay `<TOKEN>`, `<ref>`, `<webhook secret>`, viết liền một dòng):

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ref>.supabase.co/functions/v1/telegram-webhook&secret_token=<webhook secret>&allowed_updates=["message","callback_query"]
```

Kết quả đúng là `{"ok":true,"result":true,"description":"Webhook was set"}`. Sau đó mở link sau để kiểm tra: `url` phải đúng, `last_error_message` phải trống.

```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

- Link chứa token bot, nên xoá hai link này khỏi lịch sử trình duyệt sau khi dùng.
- Nếu mạng công ty chặn `api.telegram.org`, mở link bằng điện thoại dùng 4G.

### 6.4. Kiểm tra function chạy được

- Nhắn `/help` cho bot. Nếu bot không trả lời, vào **Edge Functions → telegram-webhook → Logs** xem lỗi.
- Job theo lịch: vào **Integrations → Cron → notify-evening → History**. Sau 15 phút phải có lượt chạy trạng thái `succeeded`.

## 7. Chạy thử

```powershell
pnpm dev     # http://localhost:3000
```

1. Đăng ký, hoặc đăng nhập bằng Google. Lần đầu vào, app hỏi ngày nhận lương.
2. Vào **Cài đặt → Thông báo → Kết nối Telegram**, bấm **Mở Telegram**, rồi bấm **Start** trong bot.
3. Nhắn cho bot `65k cơm trưa`: giao dịch phải hiện trên web trong vài giây.

Nếu đăng nhập báo lỗi, xem mã lỗi hiện dưới form:

| Mã lỗi                                                 | Nguyên nhân                                                                   | Cách sửa                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `network`, `unknown`                                   | Node không gọi được Supabase. Trên mạng công ty, proxy TLS chặn chứng chỉ.    | Chạy bằng `pnpm dev`: script đã có `--use-system-ca`. Không gọi `next dev` trực tiếp. |
| `otp_expired`                                          | Link đã hết hạn hoặc đã được dùng. Một số trình quét email mở link trước bạn. | Gửi lại link. Nên đổi mẫu email sang `token_hash` như ở mục 1.                        |
| `pkce_code_verifier_not_found`, `flow_state_not_found` | Link được mở trên trình duyệt khác với trình duyệt đã bấm gửi.                | Mở link trên đúng trình duyệt đó, hoặc đổi mẫu email sang `token_hash`.               |
| `server_error`, `unexpected_failure` khi dùng Google   | Client ID hoặc Secret của Google trong Supabase sai.                          | Kiểm tra lại mục 2. Xem chi tiết ở Supabase → **Logs → Auth**.                        |

Terminal chạy `pnpm dev` cũng in dòng `[auth/callback] …` kèm mô tả đầy đủ.

## 8. Deploy Vercel (khi sẵn sàng)

1. Import repo `minhnt165/flow` trên Vercel. Framework: Next.js; build command mặc định.
2. Environment Variables: nhập 4 biến như trong `.env.local`, với `NEXT_PUBLIC_SITE_URL=https://<domain>`.
3. Cập nhật lại các URL:
   - Supabase → Authentication → URL Configuration: Site URL và Redirect URLs dùng domain Vercel.

## Rủi ro cần biết

- Gói Free của Supabase **tạm dừng project sau khoảng 7 ngày không có request**. Khi project bị dừng, job cron cũng ngừng và bot sẽ không nhắc. Dùng hằng ngày thì thường không sao.
- Thời gian gửi job: sáng 08:00, chạy tự động góp 06:00, tổng kết tối kiểm tra mỗi 15 phút (theo `daily_summary_at` của từng người).
