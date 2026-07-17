import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

const isProd = process.env.NODE_ENV === "production";

/** Double-submit cookie pattern: no server-side storage needed. */
export function issueCsrfCookie(response: NextResponse): string {
  const token = randomBytes(32).toString("base64url");
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // client JS must read this to echo it back in the header
    sameSite: "lax",
    secure: isProd,
    path: "/",
  });
  return token;
}

export function verifyCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  return !!cookieToken && !!headerToken && cookieToken === headerToken;
}
