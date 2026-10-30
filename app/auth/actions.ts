"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as auth from "@/lib/supabase/auth";
import type { AuthFormState } from "@/lib/supabase/auth";
import { getServerClient } from "@/lib/supabase/server";
import { t } from "@/messages/vi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

async function callbackUrl(next?: string) {
  const url = new URL("/auth/callback", await siteOrigin());
  if (next && next !== "/") url.searchParams.set("next", next);
  return url.toString();
}

function readEmail(form: FormData) {
  return String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
}

export async function loginWithPassword(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const email = readEmail(form);
  const password = String(form.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { error: t.auth.errors.emailRequired };
  if (!password) return { error: t.auth.errors.invalidCredentials };

  const sb = await getServerClient();
  const { error } = await auth.signInWithPassword(sb, email, password);
  if (error) return { error: auth.authErrorMessage(error) };
  redirect(auth.safeNextPath(String(form.get("next") ?? "")));
}

export async function loginWithMagicLink(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const email = readEmail(form);
  if (!EMAIL_RE.test(email)) return { error: t.auth.errors.emailRequired };

  const sb = await getServerClient();
  const next = auth.safeNextPath(String(form.get("next") ?? ""));
  const { error } = await auth.signInWithMagicLink(sb, email, await callbackUrl(next));
  if (error) return { error: auth.authErrorMessage(error) };
  return { message: t.auth.magicSent };
}

export async function loginWithGoogle(form: FormData) {
  const sb = await getServerClient();
  const next = auth.safeNextPath(String(form.get("next") ?? ""));
  const { data, error } = await auth.signInWithGoogle(sb, await callbackUrl(next));
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signup(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = readEmail(form);
  const password = String(form.get("password") ?? "");
  const displayName = String(form.get("displayName") ?? "").trim();
  if (!EMAIL_RE.test(email)) return { error: t.auth.errors.emailRequired };
  if (password.length < 8) return { error: t.auth.errors.passwordShort };

  const sb = await getServerClient();
  const { data, error } = await auth.signUp(sb, email, password, displayName, await callbackUrl());
  if (error) return { error: auth.authErrorMessage(error) };
  // Supabase trả identities rỗng khi email đã tồn tại (chống dò email).
  if (data.user && data.user.identities?.length === 0) return { error: t.auth.errors.userExists };
  if (data.session) redirect("/");
  return { message: t.auth.signupSent };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const email = readEmail(form);
  if (!EMAIL_RE.test(email)) return { error: t.auth.errors.emailRequired };

  const sb = await getServerClient();
  const { error } = await auth.sendPasswordReset(sb, email, await callbackUrl("/reset-password"));
  if (error && error.code?.startsWith("over_")) return { error: auth.authErrorMessage(error) };
  return { message: t.auth.forgotSent };
}

export async function resetPassword(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: t.auth.errors.passwordShort };

  const sb = await getServerClient();
  const { error } = await auth.updatePassword(sb, password);
  if (error) return { error: auth.authErrorMessage(error) };
  redirect("/");
}

export async function logout() {
  const sb = await getServerClient();
  await auth.signOut(sb);
  redirect("/login");
}
