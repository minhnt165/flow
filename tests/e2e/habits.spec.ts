import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("thêm thói quen 3 ngày/tuần, tick hôm nay → chuỗi 1 ngày, 1/3 tuần này; bỏ tick → về 0", async ({
  page,
}) => {
  await signIn(page);
  const name = `Thiền E2E ${Date.now() % 100000}`;

  await page.goto("/habits");
  await page.getByRole("button", { name: "Thêm thói quen" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên thói quen").fill(name);
  await dialog.getByRole("radio", { name: "3 ngày" }).click();
  await expect(dialog.getByText(/Đạt khi tick đủ 3 ngày/)).toBeVisible();
  await dialog.getByRole("button", { name: "Thêm thói quen" }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByRole("button", { name, exact: false }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("Chưa có chuỗi");
  await expect(row).toContainText("0/3 tuần này");

  const tick = page.getByRole("checkbox", { name: `Đánh dấu hôm nay: ${name}` });
  await tick.click();
  await expect(page.getByRole("checkbox", { name: `Bỏ đánh dấu hôm nay: ${name}` })).toBeVisible();
  await expect(row).toContainText("Chuỗi 1 ngày");
  await expect(row).toContainText("1/3 tuần này");

  await page.getByRole("checkbox", { name: `Bỏ đánh dấu hôm nay: ${name}` }).click();
  await expect(tick).toBeVisible();
  await expect(row).toContainText("Chưa có chuỗi");
});
