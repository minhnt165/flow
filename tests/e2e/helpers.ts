import { expect, type Page } from "@playwright/test";

export const REAL_BACKEND = Boolean(process.env.E2E_BASE_URL);

/** Đăng nhập bằng email + mật khẩu khi chạy với Supabase thật; chế độ demo không cần. */
export async function signIn(page: Page) {
  if (!REAL_BACKEND) return;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password)
    throw new Error("Cần E2E_EMAIL và E2E_PASSWORD khi chạy với backend thật");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** "54.660.000 ₫" → 54660000 */
export function money(text: string | null) {
  return Number((text ?? "").replace(/[^\d-−]/g, "").replace("−", "-"));
}

/** Mở hộp thoại thêm giao dịch: phím N trên desktop, nút nổi trên điện thoại. */
export async function openAddDialog(page: Page) {
  const fab = page.getByRole("button", { name: "Thêm giao dịch" }).last();
  if (await fab.isVisible()) await fab.click();
  else await page.keyboard.press("n");
  await expect(page.getByRole("dialog")).toBeVisible();
}
