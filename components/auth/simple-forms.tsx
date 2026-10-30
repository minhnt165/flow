"use client";

import { useActionState } from "react";
import { requestPasswordReset, resetPassword, signup } from "@/app/auth/actions";
import { Field, FormAlert } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthFormState } from "@/lib/supabase/auth";
import { t } from "@/messages/vi";

function EmailField() {
  return (
    <Field label={t.auth.email} htmlFor="email">
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder={t.auth.emailPlaceholder}
        required
      />
    </Field>
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" size="form" disabled={pending} className="w-full shadow-accent-strong">
      {pending ? t.auth.pending : label}
    </Button>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signup, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label={t.auth.displayName} htmlFor="displayName">
        <Input
          id="displayName"
          name="displayName"
          autoComplete="nickname"
          placeholder={t.auth.displayNamePlaceholder}
        />
      </Field>
      <EmailField />
      <Field label={t.auth.password} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
      </Field>
      <FormAlert error={state.error} message={state.message} />
      <Submit pending={pending} label={t.auth.submitSignup} />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <EmailField />
      <FormAlert error={state.error} message={state.message} />
      <Submit pending={pending} label={t.auth.submitForgot} />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resetPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label={t.auth.newPassword} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
      </Field>
      <FormAlert error={state.error} message={state.message} />
      <Submit pending={pending} label={t.auth.submitReset} />
    </form>
  );
}
