import { expect, test } from "@playwright/test";
import { openAddDialog, signIn } from "./helpers";

// Lỗi iPhone: ô số tiền autoFocus khi popup còn đang trượt từ dưới lên → trình duyệt cuộn
// tối đa để "đưa ô nhập vào tầm nhìn", mở xong thì chỉ thấy nút Lưu, không thấy ô nhập số.
test("mở hộp thoại thêm giao dịch: ô số tiền đang focus và nằm trong màn hình, popup không bị cuộn", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/expenses");
  await openAddDialog(page);
  const dialog = page.getByRole("dialog");
  const amount = dialog.getByLabel("Số tiền", { exact: true });
  await expect(amount).toBeFocused();
  // Chờ hiệu ứng mở xong rồi mới đo.
  await page.waitForTimeout(400);

  const viewport = page.viewportSize()!;
  const box = (await amount.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  const scrollTop = await dialog.evaluate((el) => el.scrollTop);
  expect(scrollTop).toBe(0);
});

test("trong lúc mở, ô số tiền luôn nằm trong màn hình (popup không trượt từ dưới lên 100%)", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/expenses");
  // Ghi vị trí ô số tiền mỗi frame kể từ lúc popup xuất hiện.
  await page.evaluate(() => {
    const ys: number[] = [];
    (window as unknown as { __ys: number[] }).__ys = ys;
    const tick = () => {
      const el = document.getElementById("tx-amount");
      if (el) ys.push(el.getBoundingClientRect().top);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await openAddDialog(page);
  await page.waitForTimeout(400);
  const ys = await page.evaluate(() => (window as unknown as { __ys: number[] }).__ys);
  const vh = page.viewportSize()!.height;
  expect(ys.length).toBeGreaterThan(3);
  for (const y of ys) expect(y, `frame top=${Math.round(y)}`).toBeLessThan(vh - 100);
});
