import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { mintSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session-jwt";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
  revokeAllRefreshTokensForUser,
  rotateRefreshToken,
} from "@/lib/auth/tokens";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuditEvent } from "@/lib/auth/audit";

const isProd = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const rateLimit = await checkRateLimit({ key: `refresh:ip:${ip}`, limit: 30, windowSeconds: 15 * 60 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const rawToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!rawToken) {
    return NextResponse.json({ error: "missing_refresh_token" }, { status: 401 });
  }

  const result = await rotateRefreshToken(rawToken, { ip, userAgent });

  if (result.status === "reused") {
    // Presented an already-rotated token — signals theft/replay. Kill the whole family.
    await revokeAllRefreshTokensForUser(result.userId);
    await logAuditEvent({ userId: result.userId, eventType: "refresh_token_reuse_detected", ip, userAgent });

    const response = NextResponse.json({ error: "refresh_token_reuse_detected" }, { status: 401 });
    response.cookies.delete(REFRESH_COOKIE_NAME);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (result.status !== "rotated") {
    return NextResponse.json({ error: result.status }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, result.userId));
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 401 });
  }

  const sessionToken = await mintSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.image,
  });

  await logAuditEvent({ userId: user.id, eventType: "refresh_token_rotated", ip, userAgent });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, result.rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
    expires: result.expiresAt,
  });

  return response;
}
