import { readFileSync, copyFileSync } from "fs";
import { join } from "path";
import { db } from "./turso.js";

interface User {
  id?: number;
  name?: string;
  email: string;
  credits: number;
  videoIds: string[];
  bucketLinks: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface JsonDatabase {
  users: User[];
}

async function migrate() {
  try {
    console.log("🚀 Starting migration from JSON to Turso...");

    // 1. Create backup of original JSON file
    const jsonPath = join(process.cwd(), "data", "db.json");
    const backupPath = join(process.cwd(), "data", "db.json.bak");

    console.log("📦 Creating backup of original JSON file...");
    copyFileSync(jsonPath, backupPath);
    console.log(`✅ Backup created at: ${backupPath}`);

    // 2. Read current JSON data
    console.log("📖 Reading current JSON data...");
    const jsonData = readFileSync(jsonPath, "utf-8");
    const database: JsonDatabase = JSON.parse(jsonData);

    console.log(`📊 Found ${database.users.length} users to migrate`);

    // 3. Create table if not exists (using schema)
    console.log("🏗️ Creating users table...");
    const schemaPath = join(process.cwd(), "src", "db", "schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");
    await db.execute(schema);
    console.log("✅ Table created successfully");

    // 4. Insert all existing users into Turso database
    console.log("💾 Inserting users into Turso database...");

    for (const user of database.users) {
      try {
        await db.execute({
          sql: `INSERT INTO users (name, email, credits, video_ids, bucket_links, created_at, updated_at, deleted_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            user.name || null,
            user.email,
            user.credits,
            JSON.stringify(user.videoIds),
            JSON.stringify(user.bucketLinks),
            user.createdAt,
            user.updatedAt,
            user.deletedAt,
          ],
        });
        console.log(`✅ Migrated user: ${user.email}`);
      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error);
        throw error;
      }
    }

    // 5. Verify migration
    console.log("🔍 Verifying migration...");
    const result = await db.execute("SELECT COUNT(*) as count FROM users");
    const count = result.rows[0].count as number;

    if (count === database.users.length) {
      console.log(`✅ Migration successful! ${count} users migrated to Turso`);
    } else {
      throw new Error(
        `Migration verification failed. Expected ${database.users.length} users, found ${count}`
      );
    }

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate };
