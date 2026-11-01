import { APP_VERSION_LABEL } from "@/lib/version";
import { t } from "@/messages/vi";

/** Dòng version nhỏ ở cuối trang Khác / Cài đặt. */
export function AppVersion() {
  if (!APP_VERSION_LABEL) return null;
  return (
    <p className="relative m-0 text-center text-xs text-dim">
      {t.common.version(APP_VERSION_LABEL)}
    </p>
  );
}
