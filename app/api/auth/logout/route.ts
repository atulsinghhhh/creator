import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-jwt";
import { REFRESH_COOKIE_NAME, revokeRefreshToken } from "@/lib/auth/tokens";
import { verifyCsrf } from "@/lib/auth/csrf";
import { logAuditEvent } from "@/lib/auth/audit";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  const decoded = sessionToken ? await verifySessionToken(sessionToken).catch(() => null) : null;

  if (refreshToken) await revokeRefreshToken(refreshToken);

  await logAuditEvent({
    userId: decoded?.sub ?? null,
    eventType: "logout",
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
}
