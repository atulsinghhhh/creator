import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/argon2";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  EMAIL_VERIFICATION_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
  generateRawToken,
  hashToken,
  issueRefreshToken,
} from "@/lib/auth/tokens";
import { mintSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session-jwt";
import { sendVerificationEmail } from "@/lib/utilis/email";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuditEvent } from "@/lib/auth/audit";
import { verifyCsrf } from "@/lib/auth/csrf";
import { provisionNewUserTx } from "@/lib/billing/provision";

const isProd = process.env.NODE_ENV === "production";

const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const rateLimit = await checkRateLimit({ key: `register:ip:${ip}`, limit: 10, windowSeconds: 60 * 60 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // User creation, wallet, free subscription, signup-bonus credit, and the
  // verification token are all one atomic unit — no orphaned accounts if any
  // step fails.
  const { user, verificationRawToken } = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ name: parsed.data.name, email, passwordHash })
      .returning();

    await provisionNewUserTx(tx, user.id);

    // Email verification is optional in V0 — the account is usable immediately,
    // this just tracks verification status for later gating if ever needed.
    const verificationRawToken = generateRawToken();
    await tx.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash: hashToken(verificationRawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000),
    });

    return { user, verificationRawToken };
  });

  await logAuditEvent({ userId: user.id, eventType: "register", ip, userAgent });

  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${verificationRawToken}`;
  await sendVerificationEmail(email, verifyUrl);
  await logAuditEvent({ userId: user.id, eventType: "email_verification_sent", ip, userAgent });

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

  const response = NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { status: 201 }
  );
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
}
