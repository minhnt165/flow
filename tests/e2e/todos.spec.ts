import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("thêm nhanh một việc, đặt hạn hôm nay, tick xong → sang mục Đã xong và thẻ trang chủ", async ({
  page,
}) => {
  await signIn(page);
  const title = `Mua quà E2E ${Date.now() % 100000}`;

  await page.goto("/todos");
  // Thêm nhanh: gõ + Enter, việc nằm ở mục Không có hạn.
  const quick = page.getByLabel("Việc mới");
  await quick.fill(title);
  await quick.press("Enter");
  await expect(quick).toHaveValue("");
  const row = page.getByRole("button", { name: title, exact: true });
  await expect(row).toBeVisible();

  // Mở sửa, chọn chip Hôm nay → việc chuyển sang mục Hôm nay.
  await row.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Sửa việc" })).toBeVisible();
  await dialog.getByRole("button", { name: "Hôm nay", exact: true }).click();
  await dialog.getByLabel("Ghi chú").fill("Nhớ hỏi size");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Hạn hôm nay · Nhớ hỏi size")).toBeVisible();

  // Trang chủ hiện việc hôm nay, tick xong ngay tại đó.
  await page.getByRole("link", { name: "Trang chủ" }).first().click();
  const check = page.getByRole("checkbox", { name: `Đánh dấu xong: ${title}` });
  await expect(check).toBeVisible();
  await check.click();
  await expect(check).toBeHidden();

  // Quay lại danh sách: việc nằm trong Đã xong.
  // Điện thoại: Việc cần làm nằm trong tab Khác.
  const moreTab = page.getByRole("link", { name: "Khác" });
  if (await moreTab.isVisible()) await moreTab.click();
  await page.getByRole("link", { name: "Việc cần làm" }).first().click();
  await expect(page.getByRole("button", { name: title, exact: true })).toBeHidden();
  await page.getByRole("button", { name: /Xem \d+ việc đã xong/ }).click();
  await expect(page.getByRole("checkbox", { name: `Đánh dấu chưa xong: ${title}` })).toBeVisible();
});
