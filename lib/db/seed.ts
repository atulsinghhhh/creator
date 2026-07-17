import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const FREE_PLAN_CODE = "free" as const;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const [existing] = await db
    .select()
    .from(schema.pricingTiers)
    .where(eq(schema.pricingTiers.code, FREE_PLAN_CODE));

  if (existing) {
    console.log("Free pricing tier already seeded, skipping.");
  } else {
    await db.insert(schema.pricingTiers).values({
      code: FREE_PLAN_CODE,
      name: "Free",
      description: "Default free tier — every new signup starts here with bonus credits.",
      price: "0.00",
      currency: "INR",
      credits: 20,
      monthlyVideoLimit: 3,
      max_video_duration: 60,
      is_active: true,
    });
    console.log("Seeded free pricing tier.");
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed", err);
  process.exit(1);
});
