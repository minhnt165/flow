import { expect, test } from "@playwright/test";
import { openAddDialog, REAL_BACKEND, signIn } from "./helpers";

test("đăng nhập → thêm chi tiêu trong 3 thao tác, thấy ngay trong bảng", async ({ page }) => {
  if (REAL_BACKEND) {
    await signIn(page);
  } else {
    // Chế độ demo: trang đăng nhập vẫn hiển thị đủ 3 cách đăng nhập.
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Tiếp tục với Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Gửi link đăng nhập/ })).toBeVisible();
  }

  await page.goto("/expenses");
  const note = `E2E cơm ${Date.now() % 100000}`;

  // 1. mở hộp thoại
  await openAddDialog(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ghi chú").fill(note);
  // 2. gõ số
  await dialog.getByLabel("Số tiền", { exact: true }).fill("65000");
  await expect(dialog.getByLabel("Số tiền", { exact: true })).toHaveValue("65.000");
  await expect(dialog.getByText("Sáu mươi lăm nghìn đồng")).toBeVisible();
  // 3. chọn danh mục → lưu ngay
  await dialog.getByRole("button", { name: "Ăn uống" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  // Bảng (desktop) hoặc danh sách (mobile): lấy bản đang hiển thị.
  await expect(page.getByText(note).filter({ visible: true }).first()).toBeVisible({
    timeout: 5_000,
  });
});
