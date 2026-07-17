import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  generationDownloads,
  generations,
  pricingTiers,
  projects,
  subscriptions,
  users,
  wallets,
} from "@/lib/db/schema";

/**
 * Server-only data access for the Workplace dashboard. Every function is
 * scoped to a userId the caller obtained from the session — nothing here
 * re-checks auth.
 */

export type WorkplaceProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function getProfile(userId: string): Promise<WorkplaceProfile | null> {
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export type CreditsSummary = {
  balance: number;
  planName: string;
  planCode: "free" | "basic" | "pro" | "enterprise";
  /** Credits granted by the plan per cycle — the denominator for the progress bar. */
  planCredits: number;
  monthlyVideoLimit: number;
};

export async function getCreditsSummary(userId: string): Promise<CreditsSummary | null> {
  const [walletRow] = await db
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  const [subRow] = await db
    .select({
      planName: pricingTiers.name,
      planCode: pricingTiers.code,
      planCredits: pricingTiers.credits,
      monthlyVideoLimit: pricingTiers.monthlyVideoLimit,
    })
    .from(subscriptions)
    .innerJoin(pricingTiers, eq(subscriptions.pricingTierId, pricingTiers.id))
    .where(sql`${subscriptions.userId} = ${userId} and ${subscriptions.status} = 'active'`)
    .orderBy(desc(subscriptions.startedAt))
    .limit(1);

  if (!walletRow && !subRow) return null;

  return {
    balance: walletRow?.balance ?? 0,
    planName: subRow?.planName ?? "Free",
    planCode: subRow?.planCode ?? "free",
    planCredits: subRow?.planCredits ?? 0,
    monthlyVideoLimit: subRow?.monthlyVideoLimit ?? 0,
  };
}

export type QuickStats = {
  totalProjects: number;
  totalVideos: number;
  totalDownloads: number;
  /** Percentage of finished generations that completed successfully; null when nothing finished yet. */
  successRate: number | null;
};

export async function getQuickStats(userId: string): Promise<QuickStats> {
  const [projectRow] = await db
    .select({ total: count() })
    .from(projects)
    .where(eq(projects.userId, userId));

  const [genRow] = await db
    .select({
      completed: sql`count(*) filter (where ${generations.status} = 'completed')`.mapWith(Number),
      failed: sql`count(*) filter (where ${generations.status} = 'failed')`.mapWith(Number),
    })
    .from(generations)
    .innerJoin(projects, eq(generations.projectId, projects.id))
    .where(eq(projects.userId, userId));

  const [downloadRow] = await db
    .select({ total: count() })
    .from(generationDownloads)
    .where(eq(generationDownloads.userId, userId));

  const completed = genRow?.completed ?? 0;
  const failed = genRow?.failed ?? 0;
  const finished = completed + failed;

  return {
    totalProjects: projectRow?.total ?? 0,
    totalVideos: completed,
    totalDownloads: downloadRow?.total ?? 0,
    successRate: finished === 0 ? null : Math.round((completed / finished) * 100),
  };
}

export type RecentProject = {
  id: string;
  title: string;
  platform: string;
  status: "draft" | "in_progress" | "completed";
  updatedAt: Date;
  /** Actual duration (seconds) of the latest generation's output, if any. */
  duration: number | null;
  thumbnailUrl: string | null;
};

export async function getRecentProjects(userId: string, limit = 6): Promise<RecentProject[]> {
  const rows = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: desc(projects.updatedAt),
    limit,
    with: {
      generations: {
        orderBy: desc(generations.createdAt),
        limit: 1,
        with: { assets: true },
      },
    },
  });

  return rows.map((p) => {
    const latest = p.generations[0];
    const thumbnail = latest?.assets.find((a) => a.type === "thumbnail")?.url ?? null;
    return {
      id: p.id,
      title: p.title,
      platform: p.platform,
      status: p.status,
      updatedAt: p.updatedAt,
      duration: latest?.duration ? Number(latest.duration) : null,
      thumbnailUrl: thumbnail,
    };
  });
}

export type ActivityKind = "project_created" | "video_generated" | "video_downloaded";

export type ActivityItem = {
  kind: ActivityKind;
  /** Project (or generation's project) title the event belongs to. */
  title: string;
  projectId: string;
  at: Date;
};

export async function getRecentActivity(userId: string, limit = 8): Promise<ActivityItem[]> {
  const [created, generated, downloaded] = await Promise.all([
    db
      .select({ title: projects.title, projectId: projects.id, at: projects.createdAt })
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt))
      .limit(limit),
    db
      .select({ title: projects.title, projectId: projects.id, at: generations.updatedAt })
      .from(generations)
      .innerJoin(projects, eq(generations.projectId, projects.id))
      .where(sql`${projects.userId} = ${userId} and ${generations.status} = 'completed'`)
      .orderBy(desc(generations.updatedAt))
      .limit(limit),
    db
      .select({ title: projects.title, projectId: projects.id, at: generationDownloads.createdAt })
      .from(generationDownloads)
      .innerJoin(generations, eq(generationDownloads.generationId, generations.id))
      .innerJoin(projects, eq(generations.projectId, projects.id))
      .where(eq(generationDownloads.userId, userId))
      .orderBy(desc(generationDownloads.createdAt))
      .limit(limit),
  ]);

  return [
    ...created.map((e) => ({ ...e, kind: "project_created" as const })),
    ...generated.map((e) => ({ ...e, kind: "video_generated" as const })),
    ...downloaded.map((e) => ({ ...e, kind: "video_downloaded" as const })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}
