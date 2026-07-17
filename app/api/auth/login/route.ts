import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LoginError, verifyCredentials } from "@/lib/auth/verify-credentials";
import { mintSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session-jwt";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
  issueRefreshToken,
} from "@/lib/auth/tokens";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { verifyCsrf } from "@/lib/auth/csrf";

const isProd = process.env.NODE_ENV === "production";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const email = parsed.data.email.trim().toLowerCase();

  const ipLimit = await checkRateLimit({ key: `login:ip:${ip}`, limit: 20, windowSeconds: 15 * 60 });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: ipLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  const emailLimit = await checkRateLimit({ key: `login:email:${email}`, limit: 10, windowSeconds: 15 * 60 });
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: emailLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  try {
    const user = await verifyCredentials({ email, password: parsed.data.password, ip, userAgent });

    const sessionToken = await mintSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
    });
    const { rawToken: refreshToken, expiresAt } = await issueRefreshToken({
      userId: user.id,
      createdByIp: ip,
      userAgent,
    });

    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    });
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    if (err instanceof LoginError) {
      const status = err.code === "account_locked" ? 423 : 401;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
