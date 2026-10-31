import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("tab Thống kê: có đủ các thẻ, bấm cột tháng trong biểu đồ thu chi thì đổi tháng", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/expenses");
  await page.getByRole("link", { name: "Thống kê" }).click();
  await expect(page).toHaveURL(/\/expenses\/stats/);

  for (const name of [
    "Chi theo ngày",
    "Thu và chi 6 tháng",
    "Theo danh mục",
    "Khoản chi lớn nhất",
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(page.getByText("Đã chi", { exact: true })).toBeVisible();

  // Bấm cột đầu (cách 5 tháng) → URL có ?month=, cửa sổ 6 tháng trượt theo nên tháng đó thành cột cuối.
  const bars = page.getByRole("figure", { name: /thu nhập và chi tiêu/ }).getByRole("button");
  await expect(bars).toHaveCount(6);
  const picked = await bars.first().getAttribute("aria-label");
  await bars.first().click();
  await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
  await expect(bars.last()).toHaveAttribute("aria-pressed", "true");
  await expect(bars.last()).toHaveAttribute("aria-label", picked!);
});
