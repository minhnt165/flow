import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("thêm hoá đơn định kỳ, đánh dấu đã trả → có khoản chi trong giao dịch", async ({ page }) => {
  await signIn(page);
  const name = `Internet E2E ${Date.now() % 100000}`;

  await page.goto("/bills");
  await page.getByRole("button", { name: "Thêm hoá đơn" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên hoá đơn").fill(name);
  await dialog.getByLabel("Số tiền mỗi kỳ").fill("300000");
  await expect(dialog.getByLabel("Số tiền mỗi kỳ")).toHaveValue("300.000");
  await dialog.getByLabel("Ngày đến hạn").selectOption("15");
  await expect(dialog.getByText(/Hạn tới:/)).toBeVisible();
  await dialog.getByRole("button", { name: "Thêm hoá đơn" }).click();
  await expect(dialog).toBeHidden();

  // Hoá đơn mới nằm trong danh sách, có nút Đã trả.
  const row = page.locator("div", { has: page.getByText(name, { exact: true }) }).last();
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: `Đánh dấu đã trả ${name}` }).click();

  const pay = page.getByRole("dialog");
  await expect(pay.getByRole("heading", { name: "Đánh dấu đã trả" })).toBeVisible();
  await expect(pay.getByLabel("Số tiền đã trả")).toHaveValue("300.000");
  await pay.getByLabel("Số tiền đã trả").fill("320000");
  await pay.getByRole("button", { name: /Ghi chi 320\.000/ }).click();
  await expect(pay).toBeHidden();
  await expect(page.getByText(/Đã ghi chi 320\.000 ₫/)).toBeVisible();

  // Khoản chi xuất hiện ở Chi tiêu với ghi chú là tên hoá đơn.
  // Điều hướng phía client (chế độ demo giữ dữ liệu trong bộ nhớ, tải lại trang sẽ mất).
  await page.getByRole("link", { name: "Chi tiêu" }).first().click();
  await expect(page.getByText(name).filter({ visible: true }).first()).toBeVisible({
    timeout: 5_000,
  });
});
