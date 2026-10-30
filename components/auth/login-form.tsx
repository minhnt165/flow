"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginWithMagicLink, loginWithPassword } from "@/app/auth/actions";
import { Field, FormAlert } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthFormState } from "@/lib/supabase/auth";
import { t } from "@/messages/vi";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [pwState, pwAction, pwPending] = useActionState<AuthFormState, FormData>(
    loginWithPassword,
    { error: initialError },
  );
  const [mlState, mlAction, mlPending] = useActionState<AuthFormState, FormData>(
    loginWithMagicLink,
    {},
  );
  const pending = pwPending || mlPending;
  const state = mlPending || mlState.message || mlState.error ? mlState : pwState;

  return (
    <form action={pwAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
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
      <Field
        label={t.auth.password}
        htmlFor="password"
        aside={
          <Link href="/forgot-password" className="text-xs font-medium no-underline">
            {t.auth.forgot}
          </Link>
        }
      >
        <Input id="password" name="password" type="password" autoComplete="current-password" />
      </Field>

      <FormAlert error={state.error} message={state.message} />

      <Button type="submit" size="form" disabled={pending} className="w-full shadow-accent-strong">
        {pwPending ? t.auth.pending : t.auth.submitLogin}
      </Button>
      <button
        type="submit"
        formAction={mlAction}
        formNoValidate
        disabled={pending}
        className="min-h-11 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-soft underline underline-offset-[3px] hover:text-text disabled:opacity-50"
      >
        {mlPending ? t.auth.pending : t.auth.magicLink}
      </button>
    </form>
  );
}
