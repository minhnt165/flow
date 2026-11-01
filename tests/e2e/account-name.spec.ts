import { expect, test } from "@playwright/test";
import { REAL_BACKEND, signIn } from "./helpers";

test("đổi tên hiển thị ở Cài đặt → sidebar cập nhật ngay, không cần tải lại", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Sidebar chỉ có trên desktop");
  test.skip(REAL_BACKEND, "Không đổi tên tài khoản thật");
  await signIn(page);
  await page.goto("/settings?tab=account");

  const sidebarName = page.getByRole("button", { name: "Tài khoản" });
  const name = `Tên E2E ${Date.now() % 100000}`;
  await page.getByLabel("Tên hiển thị").fill(name);
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();

  await expect(sidebarName).toContainText(name);
});
