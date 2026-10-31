import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("tạo ghi chú, tìm không dấu, ghim lên mục Đã ghim, sửa nội dung", async ({ page }) => {
  await signIn(page);
  const stamp = Date.now() % 100000;
  const title = `Mật khẩu wifi E2E ${stamp}`;

  await page.goto("/notes");
  await page.getByRole("button", { name: "Thêm ghi chú" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tiêu đề").fill(title);
  await dialog.getByLabel("Nội dung").fill("Nhà: flow-2026\nQuán quen: caphe123");
  await dialog.getByRole("button", { name: "Thêm ghi chú" }).click();
  await expect(dialog).toBeHidden();

  const card = page.getByRole("button", { name: title, exact: true });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Quán quen: caphe123");

  // Tìm không dấu theo nội dung.
  const search = page.getByLabel("Tìm ghi chú");
  await search.fill(`caphe ${stamp}`);
  await expect(page.getByText(/Không có ghi chú nào khớp/)).toBeVisible();
  await search.fill("quan quen");
  await expect(card).toBeVisible();
  await search.fill("");

  // Ghim: ghi chú lên mục Đã ghim.
  await card.click();
  await dialog.getByRole("button", { name: "Ghim lên đầu" }).click();
  await dialog.getByLabel("Nội dung").fill("Nhà: flow-2027");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Đã ghim" })).toBeVisible();
  await expect(card).toContainText("Nhà: flow-2027");
  await expect(card.getByLabel("Đã ghim")).toBeVisible();
});
