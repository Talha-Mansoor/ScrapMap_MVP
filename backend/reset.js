const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || "db",
    user: process.env.DB_USER || "appuser",
    password: process.env.DB_PASSWORD || "apppass",
    database: process.env.DB_NAME || "postsdb",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    console.log("Resetting database...");

    await pool.query("SET FOREIGN_KEY_CHECKS = 0");

    await pool.query("TRUNCATE TABLE votes");
    await pool.query("TRUNCATE TABLE replies");
    await pool.query("TRUNCATE TABLE attachments");
    await pool.query("TRUNCATE TABLE posts");
    await pool.query("TRUNCATE TABLE channels");
    await pool.query("DELETE FROM users WHERE username <> 'admin'");
    await pool.query("ALTER TABLE users AUTO_INCREMENT = 1");

    await pool.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("Database cleared.");

    const uploadsDir = path.resolve(__dirname, "uploads");

    if (fs.existsSync(uploadsDir)) {
      for (const file of fs.readdirSync(uploadsDir)) {
        fs.rmSync(path.join(uploadsDir, file), { recursive: true, force: true });
      }
    }

    console.log("Uploads cleared.");
    await pool.end();
    console.log("Reset complete.");
  } catch (err) {
    console.error("Reset failed:", err);
    process.exit(1);
  }
}

main();