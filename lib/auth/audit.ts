import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type AuditEventType = (typeof auditLogs.$inferInsert)["eventType"];

interface LogAuditEventParams {
  userId?: string | null;
  eventType: AuditEventType;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent({
  userId,
  eventType,
  ip,
  userAgent,
  metadata,
}: LogAuditEventParams) {
  await db.insert(auditLogs).values({
    userId: userId ?? null,
    eventType,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
    metadata: metadata ?? null,
  });
}
