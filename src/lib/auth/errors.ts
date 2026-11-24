// Перевод ошибок Supabase Auth и кодов базы в ключи текстов i18n.
import type { ErrorKey } from "@/lib/i18n/ru.ts";

type ErrorLike = { code?: string | null; status?: number | null; message?: string | null };

const BY_CODE: Record<string, ErrorKey> = {
  invalid_credentials: "invalidCredentials",
  email_not_confirmed: "emailNotConfirmed",
  weak_password: "weakPassword",
  same_password: "samePassword",
  over_request_rate_limit: "rateLimited",
  rate_limited: "rateLimited",
  over_email_send_rate_limit: "emailRateLimited",
  email_address_not_authorized: "emailNotAuthorized",
  email_address_invalid: "invalidEmail",
  signup_disabled: "signupDisabled",
  email_provider_disabled: "signupDisabled",
  otp_expired: "linkExpired",
  flow_state_expired: "linkExpired",
  flow_state_not_found: "linkExpired",
  bad_code_verifier: "linkOtherBrowser",
  session_not_found: "sessionExpired",
  session_expired: "sessionExpired",
  refresh_token_not_found: "sessionExpired",
  refresh_token_already_used: "sessionExpired",
  user_banned: "userBanned",
};

export function authErrorKey(error: ErrorLike | null | undefined): ErrorKey {
  if (!error) return "generic";
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  // Коды базы (RPC) приходят в message.
  if (error.message && BY_CODE[error.message]) return BY_CODE[error.message];
  if (error.status === 429) return "rateLimited";
  if (error.status === 0 || error.message === "Failed to fetch") return "network";
  return "generic";
}

export function isErrorKey(value: string | null | undefined, keys: readonly string[]): value is ErrorKey {
  return !!value && keys.includes(value);
}
