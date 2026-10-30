import {
  isAuthRetryableFetchError,
  type AuthError,
  type EmailOtpType,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { t } from "@/messages/vi";

export type AuthFormState = { error?: string; message?: string };

export function authErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return t.auth.errors.generic;
  if (isAuthRetryableFetchError(error)) return t.auth.errors.network;
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

// Mã lỗi Supabase trả về /auth/callback (qua query error_code, hoặc từ lúc đổi code lấy phiên).
export function callbackErrorMessage(reason: string | null | undefined): string {
  const code = reason && /^[a-z0-9_]{1,64}$/.test(reason) ? reason : null;
  let message: string;
  switch (code) {
    case "otp_expired":
    case "flow_state_expired":
      message = t.auth.errors.callbackExpired;
      break;
    case "pkce_code_verifier_not_found":
    case "flow_state_not_found":
    case "bad_code_verifier":
      message = t.auth.errors.callbackOtherBrowser;
      break;
    case "access_denied":
      message = t.auth.errors.callbackDenied;
      break;
    case "network":
      message = t.auth.errors.network;
      break;
    case "server_error":
    case "unexpected_failure":
    case "provider_disabled":
    case "bad_oauth_callback":
    case "bad_oauth_state":
      message = t.auth.errors.callbackProvider;
      break;
    default:
      message = t.auth.errors.callback;
  }
  return code ? `${message} ${t.auth.errors.errorCode(code)}` : message;
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

// Link email dạng token_hash (mẫu email trong docs/SETUP.md): không cần code verifier,
// nên mở trên trình duyệt hay thiết bị khác vẫn được.
export const verifyEmailToken = (sb: SupabaseClient, tokenHash: string, type: EmailOtpType) =>
  sb.auth.verifyOtp({ token_hash: tokenHash, type });

export const signOut = (sb: SupabaseClient) => sb.auth.signOut();

export async function getCurrentUser(sb: SupabaseClient) {
  const { data } = await sb.auth.getUser();
  return data.user;
}
