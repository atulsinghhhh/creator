import { encode, decode } from "next-auth/jwt";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/auth/tokens";

// Matches Auth.js's own cookie naming (see @auth/core defaultCookies) so a
// manually-minted token here is accepted by auth()/middleware like any other
// Auth.js session cookie. NOTE: next-auth/jwt's encode/decode are intentionally
// low-level and Auth.js docs flag them as subject to change between versions —
// this is the standard pattern for server-side session refresh, but re-verify
// this file on any next-auth upgrade.
const isProd = process.env.NODE_ENV === "production";
export const SESSION_COOKIE_NAME = isProd
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

const SALT = SESSION_COOKIE_NAME;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

export interface SessionJwtClaims {
  sub: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}

export function mintSessionToken(
  claims: SessionJwtClaims,
  maxAgeSeconds = ACCESS_TOKEN_TTL_SECONDS
): Promise<string> {
  return encode({ token: claims, secret: getSecret(), salt: SALT, maxAge: maxAgeSeconds });
}

export function verifySessionToken(token: string) {
  return decode({ token, secret: getSecret(), salt: SALT });
}
