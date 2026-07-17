import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/argon2";
import { isLocked, recordFailedLogin, recordSuccessfulLogin } from "@/lib/auth/lockout";
import { logAuditEvent } from "@/lib/auth/audit";

export class LoginError extends Error {
  code: "invalid_credentials" | "account_locked";

  constructor(code: "invalid_credentials" | "account_locked", message: string) {
    super(message);
    this.code = code;
  }
}

interface VerifyCredentialsParams {
  email: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Single source of truth for email/password login: used by both the Auth.js
 * Credentials provider's `authorize()` and the custom /api/auth/login route.
 * Always throws LoginError with a generic message — never reveals whether the
 * email exists.
 */
export async function verifyCredentials({
  email,
  password,
  ip,
  userAgent,
}: VerifyCredentialsParams) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));

  if (!user || !user.passwordHash) {
    await logAuditEvent({
      eventType: "login_failure",
      ip,
      userAgent,
      metadata: { email: normalizedEmail },
    });
    throw new LoginError("invalid_credentials", "Invalid email or password");
  }

  if (isLocked(user)) {
    await logAuditEvent({ userId: user.id, eventType: "login_failure", ip, userAgent, metadata: { reason: "locked" } });
    throw new LoginError("account_locked", "Account is temporarily locked due to repeated failed logins");
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const result = await recordFailedLogin(user.id);
    await logAuditEvent({
      userId: user.id,
      eventType: result?.locked ? "account_locked" : "login_failure",
      ip,
      userAgent,
      metadata: result?.locked ? { lockedUntil: result.lockedUntil } : undefined,
    });
    throw new LoginError(result?.locked ? "account_locked" : "invalid_credentials", "Invalid email or password");
  }

  await recordSuccessfulLogin(user.id);
  await logAuditEvent({ userId: user.id, eventType: "login_success", ip, userAgent });

  return user;
}
