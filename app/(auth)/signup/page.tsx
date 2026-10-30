import type { Metadata } from "next";
import Link from "next/link";
import { AuthFooter, AuthHeading } from "@/components/auth/auth-heading";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { SignupForm } from "@/components/auth/simple-forms";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.auth.signupTitle };

export default function SignupPage() {
  return (
    <>
      <AuthHeading title={t.auth.signupTitle} subtitle={t.auth.signupSubtitle} />
      <GoogleButton />
      <OrDivider />
      <SignupForm />
      <AuthFooter>
        <span className="text-sm text-muted-foreground">
          {t.auth.haveAccount}{" "}
          <Link href="/login" className="font-semibold no-underline">
            {t.auth.submitLogin}
          </Link>
        </span>
      </AuthFooter>
    </>
  );
}
