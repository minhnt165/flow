import type { Metadata } from "next";
import Link from "next/link";
import { AuthFooter, AuthHeading } from "@/components/auth/auth-heading";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.auth.loginTitle };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const initialError = error
    ? error === "callback"
      ? t.auth.errors.callback
      : t.auth.errors.generic
    : undefined;

  return (
    <>
      <AuthHeading title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle} />
      <GoogleButton next={next} />
      <OrDivider />
      <LoginForm next={next} initialError={initialError} />
      <AuthFooter>
        <span className="text-sm text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link href="/signup" className="font-semibold no-underline">
            {t.auth.signUp}
          </Link>
        </span>
      </AuthFooter>
    </>
  );
}
