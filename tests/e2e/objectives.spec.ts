import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("tạo mục tiêu 3 buổi/tuần, hạn 3 tháng, 2 kết quả → chi tiết 0%; tick buổi hôm nay, xong 1 kết quả → 50%", async ({
  page,
}) => {
  await signIn(page);
  const name = `Học Rust E2E ${Date.now() % 100000}`;

  await page.goto("/objectives");
  await page.getByRole("button", { name: "Thêm mục tiêu" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên mục tiêu").fill(name);
  await dialog.getByRole("button", { name: "3 tháng" }).click();
  await dialog.getByRole("radio", { name: "3 buổi" }).click();
  await expect(dialog.getByText(/đủ 3 buổi trong tuần/)).toBeVisible();
  await dialog.getByLabel("Kết quả đầu ra").fill("Đọc xong The Book\nViết CLI nhỏ");
  await dialog.getByRole("button", { name: "Tạo mục tiêu" }).click();
  await expect(dialog).toBeHidden();

  // Tạo xong chuyển sang màn chi tiết.
  await expect(page).toHaveURL(/\/objectives\/[^/]+$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("0/2 kết quả đầu ra đã xong")).toBeVisible();
  await expect(page.getByText(/^Tuần 1\/1[34]$/)).toBeVisible();

  await page.getByRole("button", { name: "Hôm nay đã làm" }).click();
  await expect(page.getByRole("button", { name: "Đã làm hôm nay" })).toBeVisible();
  await expect(page.getByText("1 buổi", { exact: true })).toBeVisible();

  await page.getByRole("checkbox", { name: "Đánh dấu xong: Đọc xong The Book" }).click();
  await expect(page.getByText("1/2 kết quả đầu ra đã xong")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "50% hoàn thành" })).toBeVisible();

  // Thêm kết quả mới ngay trên màn chi tiết.
  await page.getByLabel("Kết quả đầu ra mới").fill("Đóng góp 1 PR");
  await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(page.getByText("1/3 kết quả đầu ra đã xong")).toBeVisible();

  // Danh sách: mục tiêu nằm trong Đang thực hiện, tuần này 1/3 buổi.
  await page.getByRole("link", { name: "Mục tiêu", exact: true }).first().click();
  const row = page.getByRole("link", { name: new RegExp(name) });
  await expect(row).toContainText("1/3 kết quả");
  await expect(row).toContainText("Tuần này 1/3 buổi");
});
