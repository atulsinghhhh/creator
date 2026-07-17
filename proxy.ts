import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

// HTTPS itself is enforced at the hosting/reverse-proxy layer (TLS termination),
// not here — this just tells browsers to always use HTTPS for this origin once seen.
export function proxy() {
  const response = NextResponse.next();

  if (isProd) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
