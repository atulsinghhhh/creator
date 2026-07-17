import { NextRequest } from "next/server";
import { handlers } from "@/lib/utilis/auth";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-jwt";
import { issueRefreshToken, REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from "@/lib/auth/tokens";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuditEvent } from "@/lib/auth/audit";

const isProd = process.env.NODE_ENV === "production";

/**
 * Auth.js's own callback flow (used for Google OAuth) sets its session cookie
 * internally and returns its own Response — there's no `events` hook that can
 * attach an extra Set-Cookie. So we wrap the handler here: if a session cookie
 * was just set (i.e. sign-in succeeded), decode it and layer our own
 * refresh-token cookie + audit log onto the same response.
 */
async function attachRefreshCookie(request: NextRequest, response: Response): Promise<Response> {
  const existingSetCookies = response.headers.getSetCookie();
  const sessionCookieRaw = existingSetCookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookieRaw) return response;

  const tokenValue = decodeURIComponent(sessionCookieRaw.split(";")[0].split("=").slice(1).join("="));
  const decoded = await verifySessionToken(tokenValue).catch(() => null);
  if (!decoded?.sub) return response;

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const { rawToken, expiresAt } = await issueRefreshToken({
    userId: decoded.sub,
    createdByIp: ip,
    userAgent,
  });

  await logAuditEvent({
    userId: decoded.sub,
    eventType: "login_success",
    ip,
    userAgent,
    metadata: { via: "oauth" },
  });

  const refreshCookie = [
    `${REFRESH_COOKIE_NAME}=${rawToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${REFRESH_TOKEN_TTL_SECONDS}`,
    `Expires=${expiresAt.toUTCString()}`,
    ...(isProd ? ["Secure"] : []),
  ].join("; ");

  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  for (const cookie of existingSetCookies) headers.append("set-cookie", cookie);
  headers.append("set-cookie", refreshCookie);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(request: NextRequest) {
  const response = await handlers.GET(request);
  return attachRefreshCookie(request, response);
}

export async function POST(request: NextRequest) {
  const response = await handlers.POST(request);
  return attachRefreshCookie(request, response);
}
