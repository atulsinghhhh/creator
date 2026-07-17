import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle/migrations" });

  await client.end();
  console.log("Migrations applied successfully");
}

main().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
