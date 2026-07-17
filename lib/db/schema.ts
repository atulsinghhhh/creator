import {
  pgTable,
  text,
  timestamp,
  uuid,
  decimal,
  jsonb,
  varchar,
  pgEnum,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const subscriptionPlans = pgEnum("subscription_plans", ["free", "basic", "pro", "enterprise"]);
export const subscriptionStatuses = pgEnum("subscription_statuses", ["active", "canceled", "past_due", "unpaid"]);
export const InvoiceStatuses = pgEnum("invoice_statuses", ["paid", "unpaid", "pending", "refunded", "void"]);
export const ProjectStatuses = pgEnum("project_statuses", ["draft", "in_progress", "completed"]);
// "pending" is legacy/unused — new generations start "queued" (mirrors job_statuses).
export const GenerationStatuses = pgEnum("generation_statuses", ["pending", "queued", "processing", "completed", "failed"]);
// "none" is used for the free tier — it has no real external payment provider behind it.
export const SubscriptionProviders = pgEnum("subscription_providers", ["none", "stripe", "paypal", "Razorpay"]);
export const walletTransactionType = pgEnum("wallet_transaction_types", ["credit", "debit"]);
export const jobSteps = pgEnum("job_steps", ["moderation", "planner", "script", "voice", "captions", "media", "render", "export",]);
export const jobStatuses = pgEnum("job_statuses", [ "queued", "running", "completed", "failed", "cancelled", ]);
export const auditEventTypes = pgEnum("audit_event_types", [
  "register",
  "login_success",
  "login_failure",
  "logout",
  "account_locked",
  "account_unlocked",
  "password_reset_requested",
  "password_reset_completed",
  "password_changed",
  "email_verification_sent",
  "email_verified",
  "refresh_token_rotated",
  "refresh_token_reuse_detected",
]);



export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  // Argon2id hash — never store or log the plaintext password. Null for OAuth-only accounts.
  passwordHash: text(),
  email: text().notNull().unique(),
  emailVerified: timestamp({ mode: "date" }),
  image: text(),
  failedLoginAttempts: integer().notNull().default(0),
  // Number of times this account has been locked out — used to compute increasing lockout delays.
  lockoutCount: integer().notNull().default(0),
  lockedUntil: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

// Auth.js DrizzleAdapter contract (OAuth account linking, e.g. Google) — column names/shape
// must match what @auth/drizzle-adapter expects.
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
);

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // SHA-256 hash of the opaque refresh token — the raw token is never stored.
  tokenHash: text().notNull().unique(),
  // Shared across a rotation chain so a whole family can be revoked on reuse detection.
  family: uuid().notNull(),
  expiresAt: timestamp().notNull(),
  revokedAt: timestamp(),
  replacedByTokenHash: text(),
  createdByIp: text(),
  userAgent: text(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text().notNull().unique(),
  expiresAt: timestamp().notNull(),
  usedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text().notNull().unique(),
  expiresAt: timestamp().notNull(),
  usedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid().defaultRandom().primaryKey(),
  // Nullable: some events (e.g. login_failure for an unknown email) have no known user.
  userId: uuid().references(() => users.id, { onDelete: "set null" }),
  eventType: auditEventTypes().notNull(),
  ip: text(),
  userAgent: text(),
  metadata: jsonb(),
  createdAt: timestamp().notNull().defaultNow(),
});


// think about workspace
export const projects = pgTable("projects", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text().notNull(),
  prompt: text().notNull(),
  status: ProjectStatuses().notNull().default("draft"),
  platform: varchar({ length: 20 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const generations = pgTable("generations", {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid()
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  script: text(),
  voiceUrl: text(),
  subtitleUrl: text(),
  videoUrl: text(),
  duration: decimal({ precision: 10, scale: 2 }),
  cost: decimal({ precision: 10, scale: 4 }).notNull().default("0"),
  status: GenerationStatuses().notNull().default("queued"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: uuid().defaultRandom().primaryKey(),
  generationId: uuid()
    .notNull()
    .references(() => generations.id, { onDelete: "cascade" }),
  type: varchar({ length: 50 }).notNull(),
  url: text().notNull(),
  source: varchar({ length: 100 }).notNull(),
  metadata: jsonb(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pricingTierId: uuid()
    .notNull()
    .references(() => pricingTiers.id, { onDelete: "cascade" }),
  status: subscriptionStatuses().notNull().default("active"),
  startedAt: timestamp().notNull().defaultNow(),
  endedAt: timestamp(),
  providerSubscriptionId: text().notNull(),
  provider: SubscriptionProviders().notNull(),
  cancelAt: timestamp(),
  renewalAt: timestamp(),
  cancelAtPeriodEnd: boolean().notNull().default(false),
  providerCustomerId: text().notNull(),
  currentPeriodStart: timestamp(),
  currentPeriodEnd: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const pricingTiers = pgTable("pricing_tiers", {
  id: uuid().defaultRandom().primaryKey(),
  code: subscriptionPlans().notNull().unique(),
  name: text().notNull(),
  description: text(),
  price: decimal({ precision: 10, scale: 2 }).notNull(),
  currency: varchar({ length: 10 }).notNull().default("INR"),
  credits: integer().notNull(),
  monthlyVideoLimit: integer().notNull(),
  max_video_duration: integer().notNull(),
  is_active: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: uuid()
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  currency: varchar({ length: 10 }).notNull().default("INR"),
  amount: decimal({ precision: 10, scale: 2 }).notNull(),
  status: InvoiceStatuses().notNull(),
  invoiceUrl: text().notNull(),
  providerInvoiceId: text().notNull(),
  paidAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  
  balance: integer().notNull().default(0),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid().defaultRandom().primaryKey(),

  walletId: uuid()
    .notNull()
    .references(() => wallets.id, { onDelete: "cascade" }),
  type: walletTransactionType().notNull(),
  amount: integer().notNull(),
  reason: varchar({ length: 255 }).notNull(),
  balanceAfter: integer().notNull(),
  reference_id: uuid(),
  meta: jsonb(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

// Append-only download events — powers the Workplace "total downloads" stat
// and "video downloaded" activity feed. Recorded when a user downloads a
// Generation's final video.
export const generationDownloads = pgTable("generation_downloads", {
  id: uuid().defaultRandom().primaryKey(),
  generationId: uuid()
    .notNull()
    .references(() => generations.id, { onDelete: "cascade" }),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp().notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid().defaultRandom().primaryKey(),

  generationId: uuid()
    .notNull()
    .references(() => generations.id, {
      onDelete: "cascade",
    }),

  // BullMQ Job ID
  bullJobId: text().notNull().unique(),
  step: jobSteps().notNull(),
  status: jobStatuses().notNull().default("queued"),
  attempts: integer().notNull().default(0),
  maxAttempts: integer().notNull().default(3),
  progress: integer().notNull().default(0),
  provider: text(),
  model: text(),
  startedAt: timestamp(),
  finishedAt: timestamp(),
  error: text(),
  metadata: jsonb(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

// One row per external provider call, INCLUDING each retry — cost per attempt
// (ARCHITECTURE.md §5), so a flaky provider inflating unit economics is
// visible. generationId is null for standalone/debug stage runs.
export const providerCalls = pgTable("provider_calls", {
  id: uuid().defaultRandom().primaryKey(),
  generationId: uuid().references(() => generations.id, { onDelete: "cascade" }),
  step: jobSteps().notNull(),
  provider: text().notNull(),
  model: text(),
  promptTokens: integer(),
  completionTokens: integer(),
  costUsd: decimal({ precision: 10, scale: 6 }).notNull().default("0"),
  latencyMs: integer().notNull(),
  success: boolean().notNull(),
  error: text(),
  attempt: integer().notNull().default(1),
  createdAt: timestamp().notNull().defaultNow(),
});

export const providerCallsRelations = relations(providerCalls, ({ one }) => ({
  generation: one(generations, {
    fields: [providerCalls.generationId],
    references: [generations.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  generation: one(generations, {
    fields: [jobs.generationId],
    references: [generations.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  subscriptions: many(subscriptions),
  wallets: many(wallets),
  accounts: many(accounts),
  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
  emailVerificationTokens: many(emailVerificationTokens),
  auditLogs: many(auditLogs),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, { fields: [emailVerificationTokens.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  generations: many(generations),
}));

export const generationsRelations = relations(generations, ({ one, many }) => ({
  project: one(projects, {
    fields: [generations.projectId],
    references: [projects.id],
  }),
  assets: many(assets),
  jobs: many(jobs),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  generation: one(generations, {
    fields: [assets.generationId],
    references: [generations.id],
  }),
}));

export const generationDownloadsRelations = relations(generationDownloads, ({ one }) => ({
  generation: one(generations, {
    fields: [generationDownloads.generationId],
    references: [generations.id],
  }),
  user: one(users, {
    fields: [generationDownloads.userId],
    references: [users.id],
  }),
}));

