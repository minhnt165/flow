import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("tạo quỹ mục tiêu 15 triệu hạn 06/02/2027, góp 6,5 triệu: chi tiết hiện 43%", async ({
  page,
}) => {
  await signIn(page);
  const name = `Quỹ Tết E2E ${Date.now() % 100000}`;

  await page.goto("/expenses/funds");
  await page.getByRole("button", { name: "Tạo quỹ mới" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên quỹ").fill(name);
  await dialog.getByRole("button", { name: /Mục tiêu/ }).click();
  await dialog.getByLabel("Số tiền mục tiêu").fill("15000000");
  await dialog.getByLabel("Hạn đạt").fill("2027-02-06");
  await expect(dialog.getByText("Kế hoạch của bạn")).toBeVisible();
  await dialog.getByRole("button", { name: "Tạo quỹ" }).click();
  await expect(dialog).toBeHidden();

  // Góp 6.500.000 từ Sinh hoạt vào quỹ mới.
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByRole("button", { name: "Góp vào quỹ" }).click();
  const tx = page.getByRole("dialog");
  await tx.getByLabel("Số tiền chuyển").fill("6500000");
  await tx.getByRole("button", { name: /^Chuyển 6\.500\.000/ }).click();
  await expect(tx).toBeHidden();

  await expect(page.getByText("43%").first()).toBeVisible();
  await expect(page.getByText("8.500.000 ₫").first()).toBeVisible();
  await expect(page.getByText(/× \d+$/)).toBeVisible();
});
