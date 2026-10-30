import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import { t } from "@/messages/vi";

export type AuthFormState = { error?: string; message?: string };

export function authErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return t.auth.errors.generic;
  switch (error.code) {
    case "invalid_credentials":
      return t.auth.errors.invalidCredentials;
    case "email_not_confirmed":
      return t.auth.errors.emailNotConfirmed;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return t.auth.errors.rateLimited;
    case "user_already_exists":
    case "email_exists":
      return t.auth.errors.userExists;
    case "weak_password":
      return t.auth.errors.passwordShort;
    default:
      return t.auth.errors.generic;
  }
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export const signInWithPassword = (sb: SupabaseClient, email: string, password: string) =>
  sb.auth.signInWithPassword({ email, password });

export const signInWithMagicLink = (sb: SupabaseClient, email: string, redirectTo: string) =>
  sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });

export const signInWithGoogle = (sb: SupabaseClient, redirectTo: string) =>
  sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });

export const signUp = (
  sb: SupabaseClient,
  email: string,
  password: string,
  displayName: string,
  redirectTo: string,
) =>
  sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo, data: { full_name: displayName } },
  });

export const sendPasswordReset = (sb: SupabaseClient, email: string, redirectTo: string) =>
  sb.auth.resetPasswordForEmail(email, { redirectTo });

export const updatePassword = (sb: SupabaseClient, password: string) =>
  sb.auth.updateUser({ password });

export const exchangeCode = (sb: SupabaseClient, code: string) =>
  sb.auth.exchangeCodeForSession(code);

export const signOut = (sb: SupabaseClient) => sb.auth.signOut();

export async function getCurrentUser(sb: SupabaseClient) {
  const { data } = await sb.auth.getUser();
  return data.user;
}
