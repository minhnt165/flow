import { expect, test, type Page } from "@playwright/test";
import { money, signIn } from "./helpers";

async function balances(page: Page) {
  const total = money(
    await page
      .getByText(/^Tổng số dư \d+ quỹ$/)
      .locator("xpath=..")
      .locator(".num-xl")
      .textContent(),
  );
  return total;
}

test("chuyển 1.000.000 từ Sinh hoạt sang quỹ khác: số dư hai quỹ đổi đúng, tổng không đổi", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/expenses/funds");
  await expect(page.getByText("Sinh hoạt").first()).toBeVisible();

  const card = (name: string) =>
    page.locator(".card", { hasText: name }).filter({ has: page.locator("span.font-display") });
  const fromBefore = money(
    await card("Sinh hoạt").first().locator("span.font-display").first().textContent(),
  );
  const totalBefore = await balances(page);

  await page.keyboard.press("n");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Chuyển quỹ" }).click();
  await dialog.getByRole("button", { name: "Từ quỹ" }).click();
  await page.getByRole("menuitem", { name: /Sinh hoạt/ }).click();
  await dialog.getByRole("button", { name: "Đến quỹ" }).click();
  const target = page.getByRole("menuitem").filter({ hasNotText: "Sinh hoạt" }).first();
  const targetName = ((await target.locator("span.truncate").textContent()) ?? "").trim();
  await target.click();
  await dialog.getByRole("button", { name: "1 triệu" }).click();
  await expect(dialog.getByText("Sinh hoạt sau khi chuyển")).toBeVisible();
  const toBefore = money(
    await card(targetName).first().locator("span.font-display").first().textContent(),
  );
  await dialog.getByRole("button", { name: "Chuyển 1.000.000 ₫" }).click();
  await expect(dialog).toBeHidden();

  await expect
    .poll(async () =>
      money(await card("Sinh hoạt").first().locator("span.font-display").first().textContent()),
    )
    .toBe(fromBefore - 1_000_000);
  await expect
    .poll(async () =>
      money(await card(targetName).first().locator("span.font-display").first().textContent()),
    )
    .toBe(toBefore + 1_000_000);
  expect(await balances(page)).toBe(totalBefore);
});
