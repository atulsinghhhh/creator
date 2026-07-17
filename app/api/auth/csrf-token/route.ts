import { NextResponse } from "next/server";
import { issueCsrfCookie } from "@/lib/auth/csrf";

// Clients call this once (e.g. on app load) to obtain a CSRF token cookie, then
// echo its value back via the x-csrf-token header on mutating auth requests.
export async function GET() {
  const response = NextResponse.json({ csrfToken: "" });
  const token = issueCsrfCookie(response);
  return NextResponse.json({ csrfToken: token }, { headers: response.headers });
}
