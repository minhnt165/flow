import type { Metadata } from "next";
import Link from "next/link";
import { AuthFooter, AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/simple-forms";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.auth.forgotTitle };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle} />
      <ForgotPasswordForm />
      <AuthFooter>
        <Link href="/login" className="text-sm font-semibold no-underline">
          {t.auth.backToLogin}
        </Link>
      </AuthFooter>
    </>
  );
}
