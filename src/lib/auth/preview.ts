/**
 * Shared LIVE-PREVIEW OAuth client (server-only — NEVER import from the client).
 *
 * The sandbox serves each live preview on a dynamic `https://*.grok-sandbox.com`
 * URL, which can't be pre-registered per app. The broker instead exposes ONE
 * shared "preview" client that accepts any
 * `https://*.grok-sandbox.com/api/auth/oauth2/callback/*`
 * (broker: `app-builder-deployer/auth/src/preview-oauth.ts`). Baking it here lets
 * the live preview do REAL sign-in — no demo/mock users — with no platform
 * injection. When deployed the deployer injects a per-app
 * `GROK_AUTH_*` that overrides these (see `server.ts`).
 *
 * ⚠️ SEC-001 — KNOWN, UNRESOLVED ISSUE. `PREVIEW_CLIENT_SECRET` below is a live
 * credential committed to version control. It is reachable by anyone with read
 * access to this repository AND by anyone who can read its git history. Moving
 * it to an environment variable (done below) does NOT undo that: the literal is
 * still in every historical commit.
 *
 * The only real remediation is, in this order:
 *   1. Regenerate `GROK_PREVIEW_CLIENT_SECRET` in the broker's Vercel env (the
 *      broker stores only its `base64url(SHA-256)` hash).
 *   2. Set `GROK_PREVIEW_CLIENT_SECRET` in this app's env to the new value.
 *   3. Purge the old literal from git history and force-push.
 * Step 1 requires broker access this repository does not have, so it cannot be
 * automated from here.
 *
 * What changed: both values are now read from the environment first, so the
 * credential can be rotated by setting an env var instead of editing and
 * redeploying source. The baked constants remain as the fallback ONLY so the
 * sandbox live preview keeps working exactly as before — removing them would
 * silently break real sign-in in preview, which is a shipped feature.
 *
 * This is a dedicated, low-privilege client (preview-only,
 * `*.grok-sandbox.com`). Deployed apps do not use it: the deployer injects
 * `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET`, which take precedence in
 * `server.ts`.
 */

/** Read an env var, treating empty/whitespace as unset. Safe if `process` is absent. */
function envValue(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

/** Baked fallback — see the SEC-001 note above before changing. */
const BAKED_PREVIEW_CLIENT_ID = "grok_preview";
const BAKED_PREVIEW_CLIENT_SECRET =
  "8bcdb7fc5a33874ad933ca568918d5790388a0795e44c4d1dea691f801b17ec5";

export const PREVIEW_CLIENT_ID =
  envValue("GROK_PREVIEW_CLIENT_ID") ?? BAKED_PREVIEW_CLIENT_ID;

export const PREVIEW_CLIENT_SECRET =
  envValue("GROK_PREVIEW_CLIENT_SECRET") ?? BAKED_PREVIEW_CLIENT_SECRET;

/** True when the process is still relying on the committed fallback credential. */
export const usingBakedPreviewSecret =
  PREVIEW_CLIENT_SECRET === BAKED_PREVIEW_CLIENT_SECRET;

/** The shared auth broker issuer (OIDC discovery lives under it). */
export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";

/**
 * Host patterns whose callbacks the preview client accepts. Better Auth derives
 * the live preview's real origin from the request host and validates it against
 * this list (wildcard-matched), so the OAuth `redirect_uri` becomes the concrete
 * `https://<preview-host>/api/auth/oauth2/callback/...` the broker allows.
 */
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;
