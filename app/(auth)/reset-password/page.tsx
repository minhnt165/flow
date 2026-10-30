import type { Metadata } from "next";
import { AuthFooter, AuthHeading } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/simple-forms";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.auth.resetTitle };

// Người dùng tới đây từ link đặt lại mật khẩu (đã có phiên sau /auth/callback).
export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title={t.auth.resetTitle} subtitle={t.auth.resetSubtitle} />
      <ResetPasswordForm />
      <AuthFooter />
    </>
  );
}
