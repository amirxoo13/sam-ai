/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * ورود با ایمیل و رمز روی همین مبدأ (`/api/auth/*`). کارگزار OAuth خارجی
 * و سکرت پیش‌نمایش حذف شده‌اند.
 */
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";

void ensureDbReady();

const globalAuthRef = globalThis as typeof globalThis & {
  __ahaAuthPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__ahaAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__ahaAuthPreviewSecret__;
}

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const authDisabled = env("VITE_AUTH_ENABLED") === "false";

/** True when email/password sign-in is active (real auth is enforced). */
export const authConfigured = !authDisabled && emailAndPasswordEnabled;

const explicitBaseURL = env("BETTER_AUTH_URL");
function vercelOrigin(host: string | undefined): string | undefined {
  if (!host) return undefined;
  return host.startsWith("http") ? host.replace(/\/+$/, "") : `https://${host}`;
}
const vercelOrigins = [
  vercelOrigin(env("VERCEL_PROJECT_PRODUCTION_URL")),
  vercelOrigin(env("VERCEL_URL")),
  "https://sam-ai-green.vercel.app",
].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];
const baseURL = explicitBaseURL ?? {
  allowedHosts: [
    "localhost",
    "127.0.0.1",
    "[::1]",
    "sam-ai-green.vercel.app",
    "*.vercel.app",
  ],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};

const trustedOrigins: string[] = explicitBaseURL
  ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS, ...vercelOrigins, "https://*.vercel.app"]
  : [...LOCAL_DEV_ORIGINS, ...vercelOrigins, "https://*.vercel.app"];

const databaseUrl = env("DATABASE_URL") ?? env("POSTGRES_URL") ?? env("POSTGRES_URL_NON_POOLING");

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const SESSION_TOKEN_COOKIE = "__Host-aha-auth.session_token";

export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
  database,
  trustedOrigins,
  session: { cookieCache: { enabled: true, maxAge: 300 } },
  ...(emailAndPasswordEnabled
    ? {
        emailAndPassword: {
          enabled: true,
          resetPasswordTokenExpiresIn: 3600,
          sendResetPassword: async ({
            user,
            url,
          }: {
            user: { email: string };
            url: string;
          }) => {
            const { consumeRateLimit } = await import("../rate-limit.server");
            const decision = await consumeRateLimit(`reset:${user.email.toLowerCase()}`, {
              limit: 5,
              windowSeconds: 3600,
            });
            if (!decision.allowed) {
              throw new Error("too many reset requests");
            }
            const { sendTransactionalEmail } = await import("../mail.server");
            await sendTransactionalEmail({
              to: user.email,
              subject: "بازیابی رمز عبور — هوش مصنوعی اها",
              text: `برای تعیین رمز جدید این پیوند را باز کنید:\n${url}\n\nاگر این درخواست از سمت شما نبوده، این پیام را نادیده بگیرید. پیوند یک ساعت معتبر است.`,
              html: `<p>برای تعیین رمز جدید حساب در هوش مصنوعی اها، این پیوند را باز کنید:</p>
<p><a href="${url}">${url}</a></p>
<p>اگر این درخواست از سمت شما نبوده، این پیام را نادیده بگیرید. پیوند یک ساعت معتبر است.</p>`,
            });
          },
        },
      }
    : {}),
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-aha-auth.session_data" },
      account_data: { name: "__Host-aha-auth.account_data" },
      dont_remember: { name: "__Host-aha-auth.dont_remember" },
    },
  },
  plugins: [tanstackStartCookies()],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}
