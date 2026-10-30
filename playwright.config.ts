import { defineConfig, devices } from "@playwright/test";

// Mặc định chạy với chế độ demo (dữ liệu mẫu, không cần Supabase).
// Chạy với backend thật: E2E_BASE_URL=http://localhost:3000 E2E_EMAIL=... E2E_PASSWORD=... pnpm test:e2e
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const useDemo = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 844 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: useDemo
    ? {
        command: "pnpm dev:demo",
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
      }
    : undefined,
});
