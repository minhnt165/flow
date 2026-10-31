import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

async function createFreeFund(page: Page, name: string) {
  await page.getByRole("button", { name: "Tạo quỹ mới" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên quỹ").fill(name);
  await dialog.getByRole("button", { name: /Tự do/ }).click();
  await dialog.getByRole("button", { name: "Tạo quỹ" }).click();
  await expect(dialog).toBeHidden();
}

test("quỹ chưa có giao dịch: xoá hẳn khỏi danh sách", async ({ page }) => {
  await signIn(page);
  const name = `Quỹ xoá E2E ${Date.now() % 100000}`;
  await page.goto("/settings?tab=wallets");
  await createFreeFund(page, name);

  await page.getByRole("button", { name: new RegExp(name) }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Xoá quỹ" }).click();
  await dialog.getByRole("button", { name: "Bấm lần nữa để xoá" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Đã xoá quỹ")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(name) })).toHaveCount(0);
});

test("đổi quỹ mặc định rồi mới xoá được Sinh hoạt; quỹ đã có giao dịch thì lưu trữ", async ({
  page,
}) => {
  await signIn(page);
  const name = `Quỹ chính E2E ${Date.now() % 100000}`;
  await page.goto("/settings?tab=wallets");

  await page.getByRole("button", { name: /^Sinh hoạt/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Xoá quỹ" })).toHaveCount(0);
  await expect(dialog.getByText(/Đặt quỹ khác làm mặc định trước/)).toBeVisible();
  await dialog.getByRole("button", { name: "Huỷ" }).click();

  await createFreeFund(page, name);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await dialog.getByRole("button", { name: "Đặt làm quỹ mặc định" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: new RegExp(`${name}.*Mặc định`) })).toBeVisible();

  await page.getByRole("button", { name: /^Sinh hoạt/ }).click();
  await dialog.getByRole("button", { name: "Xoá quỹ" }).click();
  await dialog.getByRole("button", { name: "Bấm lần nữa để xoá" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/được lưu trữ để giữ lịch sử/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Sinh hoạt/ })).toHaveCount(0);
});
