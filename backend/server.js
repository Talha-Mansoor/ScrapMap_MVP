const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();


app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ type: "application/json" }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

const uploadsDir = "/app/uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp"
]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Only PNG, JPEG/JPG, and WebP files are allowed"));
    }
    cb(null, true);
  }
});

function jsonError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    jsonError(res, 400, "BadRequest", "id must be a positive integer");
    return null;
  }
  return id;
}

function parseLimitOffset(req) {
  const limitRaw = req.query.limit ?? "20";
  const offsetRaw = req.query.offset ?? "0";

  let limit = Number(limitRaw);
  let offset = Number(offsetRaw);

  if (!Number.isInteger(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  if (!Number.isInteger(offset) || offset < 0) offset = 0;

  return { limit, offset };
}

function parseSort(req) {
  const sort = (req.query.sort ?? "created_desc").toString();
  if (sort === "created_asc") {
    return { sort, orderBy: "p.created_at ASC, p.id ASC" };
  }
  return { sort: "created_desc", orderBy: "p.created_at DESC, p.id DESC" };
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return jsonError(res, 401, "Unauthorized", "login required");
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return jsonError(res, 401, "Unauthorized", "login required");
  }
  if (req.session.user.role !== "admin") {
    return jsonError(res, 403, "Forbidden", "admin access required");
  }
  next();
}

function canEditOwnPost(req, post) {
  return req.session?.user && post.author_id === req.session.user.id;
}

let pool;

async function initDb() {
  pool = await mysql.createPool({
    host: process.env.DB_HOST || "db",
    user: process.env.DB_USER || "appuser",
    password: process.env.DB_PASSWORD || "apppass",
    database: process.env.DB_NAME || "postsdb",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z"
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      display_name VARCHAR(100) NOT NULL,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const adminHash = await bcrypt.hash("admin123", 10);
  await pool.query(
    `
    INSERT INTO users (display_name, username, password_hash, role)
    SELECT 'Admin', 'admin', ?, 'admin'
    WHERE NOT EXISTS (
      SELECT 1 FROM users WHERE username = 'admin'
    )
    `,
    [adminHash]
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS channels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    )
  `);

  await pool.query(`
    INSERT INTO channels (name)
    SELECT 'General'
    WHERE NOT EXISTS (
      SELECT 1 FROM channels WHERE name = 'General'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      topic VARCHAR(255) NOT NULL,
      data TEXT NOT NULL,
      channel_id INT NULL,
      author_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS replies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      parent_reply_id INT NULL,
      author_id INT NULL,
      data TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS votes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      target_type VARCHAR(10) NOT NULL,
      target_id INT NOT NULL,
      value INT NOT NULL,
      UNIQUE KEY unique_vote (user_id, target_type, target_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      target_type VARCHAR(20) NULL,
      target_id INT NULL,
      temp_token VARCHAR(100) NULL,
      file_path VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function toIso(row) {
  return {
    id: row.id,
    topic: row.topic,
    data: row.data,
    channel_id: row.channel_id ?? null,
    author_id: row.author_id ?? null,
    author_name: row.author_name ?? null,
    score: row.score ?? 0,
    my_vote: Number(row.my_vote ?? 0),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString()
  };
}

function replyToJson(row) {
  return {
    id: row.id,
    post_id: row.post_id,
    parent_reply_id: row.parent_reply_id ?? null,
    author_id: row.author_id ?? null,
    author_name: row.author_name ?? null,
    data: row.data,
    score: row.score ?? 0,
    my_vote: Number(row.my_vote ?? 0),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString()
  };

}

async function moveTempAttachmentsToTarget(tempToken, targetType, targetId) {
  if (!isNonEmptyString(tempToken)) return;

  await pool.query(
    `
    UPDATE attachments
    SET target_type = ?, target_id = ?, temp_token = NULL
    WHERE temp_token = ?
    `,
    [targetType, targetId, tempToken]
  );
}

app.get("/api/health", async (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", (req, res) => {
  res.json({ user: req.session?.user || null });
});

app.post("/api/signup", async (req, res) => {
  const { display_name, username, password } = req.body ?? {};

  if (!isNonEmptyString(display_name)) {
    return jsonError(res, 400, "BadRequest", "display_name is required");
  }
  if (!isNonEmptyString(username)) {
    return jsonError(res, 400, "BadRequest", "username is required");
  }
  if (!isNonEmptyString(password)) {
    return jsonError(res, 400, "BadRequest", "password is required");
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (display_name, username, password_hash, role) VALUES (?, ?, ?, 'user')",
      [display_name.trim(), username.trim(), passwordHash]
    );

    req.session.user = {
      id: result.insertId,
      display_name: display_name.trim(),
      username: username.trim(),
      role: "user"
    };

    res.status(201).json({ user: req.session.user });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!isNonEmptyString(username)) {
    return jsonError(res, 400, "BadRequest", "username is required");
  }
  if (!isNonEmptyString(password)) {
    return jsonError(res, 400, "BadRequest", "password is required");
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, display_name, username, password_hash, role FROM users WHERE username = ?",
      [username.trim()]
    );

    if (rows.length === 0) {
      return jsonError(res, 401, "Unauthorized", "invalid credentials");
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return jsonError(res, 401, "Unauthorized", "invalid credentials");
    }

    req.session.user = {
      id: user.id,
      display_name: user.display_name,
      username: user.username,
      role: user.role
    };

    res.json({ user: req.session.user });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/channels", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM channels ORDER BY id ASC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});



app.post("/api/channels", requireAuth, async (req, res) => {
  const { name } = req.body ?? {};

  if (!isNonEmptyString(name)) {
    return jsonError(res, 400, "BadRequest", "name is required");
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO channels (name) VALUES (?)",
      [name.trim()]
    );

    res.status(201).json({
      id: result.insertId,
      name: name.trim()
    });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.get("/api/posts", async (req, res) => {
  const { limit, offset } = parseLimitOffset(req);
  const q = (req.query.q ?? "").toString();
  const channelIdRaw = req.query.channelId;
  const authorRaw = (req.query.author ?? "").toString().trim();
  const { sort, orderBy } = parseSort(req);
  const currentUserId = req.session?.user?.id ?? null;

  try {
    const whereParts = [];
    const params = [];

    if (channelIdRaw !== undefined) {
      const channelId = Number(channelIdRaw);
      if (!Number.isInteger(channelId) || channelId <= 0) {
        return jsonError(res, 400, "BadRequest", "channelId must be a positive integer");
      }
      whereParts.push("p.channel_id = ?");
      params.push(channelId);
    }

    if (q.trim()) {
      whereParts.push("(p.topic LIKE ? OR p.data LIKE ?)");
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    if (authorRaw) {
      whereParts.push("u.display_name LIKE ?");
      params.push(`%${authorRaw}%`);
    }

    const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [[{ total }]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      ${where}
      `,
      params
    );

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.topic,
        p.data,
        p.channel_id,
        p.author_id,
        u.display_name AS author_name,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(v.value), 0) AS score,
        COALESCE(MAX(uv.value), 0) AS my_vote
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN votes v
        ON v.target_type = 'post' AND v.target_id = p.id
      LEFT JOIN votes uv
        ON uv.target_type = 'post'
        AND uv.target_id = p.id
        AND uv.user_id = ?
      ${where}
      GROUP BY
        p.id, p.topic, p.data, p.channel_id, p.author_id,
        u.display_name, p.created_at, p.updated_at
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
      `,
      [currentUserId, ...params, limit, offset]
    );

    res.json({
      meta: {
        limit,
        offset,
        count: rows.length,
        total,
        sort,
        q,
        author: authorRaw
      },
      posts: rows.map(toIso)
    });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.post("/api/posts", requireAuth, async (req, res) => {
  const { topic, data, channel_id, temp_token } = req.body ?? {};

  if (!isNonEmptyString(topic)) {
    return jsonError(res, 400, "BadRequest", "topic is required");
  }

  if (!isNonEmptyString(data)) {
    return jsonError(res, 400, "BadRequest", "data is required");
  }

  const channelId = Number(channel_id);
  if (!Number.isInteger(channelId) || channelId <= 0) {
    return jsonError(res, 400, "BadRequest", "channel_id must be a positive integer");
  }

  const authorId = req.session.user.id;

  try {
    const [result] = await pool.query(
      "INSERT INTO posts (topic, data, channel_id, author_id) VALUES (?, ?, ?, ?)",
      [topic.trim(), data.trim(), channelId, authorId]
    );

    const id = result.insertId;

    await moveTempAttachmentsToTarget(temp_token, "post", id);

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.topic,
        p.data,
        p.channel_id,
        p.author_id,
        u.display_name AS author_name,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(v.value), 0) AS score
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
      WHERE p.id = ?
      GROUP BY p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name, p.created_at, p.updated_at
      `,
      [id]
    );

    res.status(201).json(toIso(rows[0]));
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.get("/api/posts/:id", async (req, res) => {
  const currentUserId = req.session?.user?.id ?? null;
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.topic,
        p.data,
        p.channel_id,
        p.author_id,
        u.display_name AS author_name,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(v.value), 0) AS score,
        COALESCE(MAX(uv.value), 0) AS my_vote
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN votes v
        ON v.target_type = 'post' AND v.target_id = p.id
      LEFT JOIN votes uv
        ON uv.target_type = 'post'
        AND uv.target_id = p.id
        AND uv.user_id = ?
      WHERE p.id = ?
      GROUP BY
        p.id, p.topic, p.data, p.channel_id, p.author_id,
        u.display_name, p.created_at, p.updated_at
      `,
      [currentUserId, id]
    );

    if (rows.length === 0) {
      return jsonError(res, 404, "NotFound", "post not found");
    }

    res.json(toIso(rows[0]));
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});
app.put("/api/posts/:id", requireAuth, async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const { topic, data, remove_attachments = false, temp_token } = req.body ?? {};

  if (!isNonEmptyString(topic)) {
    return jsonError(res, 400, "BadRequest", "topic is required");
  }

  if (!isNonEmptyString(data)) {
    return jsonError(res, 400, "BadRequest", "data is required");
  }

  try {
    const [existingRows] = await pool.query(
      "SELECT id, author_id, channel_id FROM posts WHERE id = ?",
      [id]
    );

    if (existingRows.length === 0) {
      return jsonError(res, 404, "NotFound", "post not found");
    }

    const existing = existingRows[0];

    if (!canEditOwnPost(req, existing) && req.session.user.role !== "admin") {
      return jsonError(res, 403, "Forbidden", "you can only edit your own post");
    }

    await pool.query(
      `
      UPDATE posts
      SET topic = ?, data = ?
      WHERE id = ?
      `,
      [topic.trim(), data.trim(), id]
    );

    if (remove_attachments) {
      const [attRows] = await pool.query(
        `
        SELECT id, file_path
        FROM attachments
        WHERE target_type = 'post' AND target_id = ?
        `,
        [id]
      );

      for (const att of attRows) {
        if (att.file_path) {
          fs.unlink(att.file_path, () => {});
        }
      }

      await pool.query(
        `
        DELETE FROM attachments
        WHERE target_type = 'post' AND target_id = ?
        `,
        [id]
      );
    }

    if (isNonEmptyString(temp_token)) {
      if (!remove_attachments) {
        const [oldAttRows] = await pool.query(
          `
          SELECT id, file_path
          FROM attachments
          WHERE target_type = 'post' AND target_id = ?
          `,
          [id]
        );

        for (const att of oldAttRows) {
          if (att.file_path) {
            fs.unlink(att.file_path, () => {});
          }
        }

        await pool.query(
          `
          DELETE FROM attachments
          WHERE target_type = 'post' AND target_id = ?
          `,
          [id]
        );
      }

      await moveTempAttachmentsToTarget(temp_token, "post", id);
    }

    const currentUserId = req.session?.user?.id ?? null;

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.topic,
        p.data,
        p.channel_id,
        p.author_id,
        u.display_name AS author_name,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(v.value), 0) AS score,
        COALESCE(MAX(uv.value), 0) AS my_vote
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN votes v
        ON v.target_type = 'post' AND v.target_id = p.id
      LEFT JOIN votes uv
        ON uv.target_type = 'post'
        AND uv.target_id = p.id
        AND uv.user_id = ?
      WHERE p.id = ?
      GROUP BY
        p.id, p.topic, p.data, p.channel_id, p.author_id,
        u.display_name, p.created_at, p.updated_at
      `,
      [currentUserId, id]
    );

    res.json(toIso(rows[0]));
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.get("/api/replies", async (req, res) => {
  const currentUserId = req.session?.user?.id ?? null;
  const postId = Number(req.query.postId);
  

  if (!Number.isInteger(postId) || postId <= 0) {
    return jsonError(res, 400, "BadRequest", "postId must be a positive integer");
  }

  try {
      const [rows] = await pool.query(
    `
    SELECT
      r.id,
      r.post_id,
      r.parent_reply_id,
      r.author_id,
      u.display_name AS author_name,
      r.data,
      r.created_at,
      COALESCE(SUM(v.value), 0) AS score,
      COALESCE(MAX(uv.value), 0) AS my_vote
    FROM replies r
    LEFT JOIN users u ON r.author_id = u.id
    LEFT JOIN votes v
      ON v.target_type = 'reply' AND v.target_id = r.id
    LEFT JOIN votes uv
      ON uv.target_type = 'reply'
      AND uv.target_id = r.id
      AND uv.user_id = ?
    WHERE r.post_id = ?
    GROUP BY
      r.id, r.post_id, r.parent_reply_id, r.author_id,
      u.display_name, r.data, r.created_at
    ORDER BY r.created_at ASC, r.id ASC
    `,
    [currentUserId, postId]
  );

    res.json(rows.map(replyToJson));
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.post("/api/replies", requireAuth, async (req, res) => {
  const { post_id, parent_reply_id, data, temp_token } = req.body ?? {};

  const postId = Number(post_id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return jsonError(res, 400, "BadRequest", "post_id must be a positive integer");
  }

  let parentReplyId = null;
  if (parent_reply_id !== undefined && parent_reply_id !== null && parent_reply_id !== "") {
    parentReplyId = Number(parent_reply_id);
    if (!Number.isInteger(parentReplyId) || parentReplyId <= 0) {
      return jsonError(res, 400, "BadRequest", "parent_reply_id must be a positive integer or null");
    }
  }

  if (!isNonEmptyString(data)) {
    return jsonError(res, 400, "BadRequest", "data is required");
  }

  const authorId = req.session.user.id;

  try {
    const [result] = await pool.query(
      "INSERT INTO replies (post_id, parent_reply_id, author_id, data) VALUES (?, ?, ?, ?)",
      [postId, parentReplyId, authorId, data.trim()]
    );

    await moveTempAttachmentsToTarget(temp_token, "reply", result.insertId);

    const [rows] = await pool.query(
      `
      SELECT
        r.id,
        r.post_id,
        r.parent_reply_id,
        r.author_id,
        u.display_name AS author_name,
        r.data,
        r.created_at,
        COALESCE(SUM(v.value), 0) AS score
      FROM replies r
      LEFT JOIN users u ON r.author_id = u.id
      LEFT JOIN votes v ON v.target_type = 'reply' AND v.target_id = r.id
      WHERE r.id = ?
      GROUP BY r.id, r.post_id, r.parent_reply_id, r.author_id, u.display_name, r.data, r.created_at
      `,
      [result.insertId]
    );

    res.status(201).json(replyToJson(rows[0]));
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.post("/api/votes", requireAuth, async (req, res) => {
  const { target_type, target_id, value } = req.body ?? {};

  if (target_type !== "post" && target_type !== "reply") {
    return jsonError(res, 400, "BadRequest", "target_type must be 'post' or 'reply'");
  }

  const targetId = Number(target_id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return jsonError(res, 400, "BadRequest", "target_id must be a positive integer");
  }

  const numericValue = Number(value);
  if (![1, 0, -1].includes(numericValue)) {
    return jsonError(res, 400, "BadRequest", "value must be 1, 0, or -1");
  }

  const userId = req.session.user.id;

  try {
    if (numericValue === 0) {
      await pool.query(
        "DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?",
        [userId, target_type, targetId]
      );
      return res.json({ ok: true, value: 0 });
    }

    await pool.query(
      `
      INSERT INTO votes (user_id, target_type, target_id, value)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
      `,
      [userId, target_type, targetId, numericValue]
    );

    res.json({ ok: true, value: numericValue });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.get("/api/attachments", async (req, res) => {
  const tempToken = (req.query.temp_token ?? "").toString().trim();
  const targetType = (req.query.target_type ?? "").toString().trim();
  const targetIdRaw = req.query.target_id;

  try {
    let rows;

    if (tempToken) {
      [rows] = await pool.query(
        `
        SELECT id, target_type, target_id, temp_token, file_path, mime_type, size, created_at
        FROM attachments
        WHERE temp_token = ?
        ORDER BY created_at ASC, id ASC
        `,
        [tempToken]
      );
    } else {
      if (targetType !== "post" && targetType !== "reply") {
        return jsonError(res, 400, "BadRequest", "target_type must be 'post' or 'reply'");
      }

      const targetId = Number(targetIdRaw);
      if (!Number.isInteger(targetId) || targetId <= 0) {
        return jsonError(res, 400, "BadRequest", "target_id must be a positive integer");
      }

      [rows] = await pool.query(
        `
        SELECT id, target_type, target_id, temp_token, file_path, mime_type, size, created_at
        FROM attachments
        WHERE target_type = ? AND target_id = ?
        ORDER BY created_at ASC, id ASC
        `,
        [targetType, targetId]
      );
    }

    const mapped = rows.map((row) => ({
      id: row.id,
      target_type: row.target_type,
      target_id: row.target_id,
      temp_token: row.temp_token,
      mime_type: row.mime_type,
      size: row.size,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(row.created_at).toISOString(),
      url: `/uploads/${path.basename(row.file_path)}`
    }));

    res.json(mapped);
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.post("/api/uploads", requireAuth, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    console.log("UPLOAD HIT");
    console.log("FILE:", req.file);
    console.log("BODY:", req.body);
    if (err) {
      return jsonError(res, 400, "BadRequest", err.message || "upload failed");
    }

    try {
      const { temp_token } = req.body ?? {};

      if (!isNonEmptyString(temp_token)) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return jsonError(res, 400, "BadRequest", "temp_token is required");
      }

      if (!req.file) {
        return jsonError(res, 400, "BadRequest", "image file is required");
      }

      const [result] = await pool.query(
        `
        INSERT INTO attachments (temp_token, file_path, mime_type, size)
        VALUES (?, ?, ?, ?)
        `,
        [temp_token.trim(), req.file.path, req.file.mimetype, req.file.size]
      );

      res.status(201).json({
        id: result.insertId,
        temp_token: temp_token.trim(),
        mime_type: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${path.basename(req.file.path)}`
      });
    } catch (e) {
      console.error(e);
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      jsonError(res, 500, "InternalServerError", "database error");
    }
  });
});

app.get("/api/search", async (req, res) => {
  const type = (req.query.type ?? "posts_text").toString();
  const q = (req.query.q ?? "").toString().trim();
  const channelIdRaw = req.query.channelId;
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20) || 20, 1), 100);

  try {
    if (type === "posts_text") {
      const params = [];
      let where = "";

      if (q) {
        where = "WHERE p.topic LIKE ? OR p.data LIKE ?";
        params.push(`%${q}%`, `%${q}%`);
      }

      const [rows] = await pool.query(
        `
        SELECT p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name AS author_name,
               p.created_at, p.updated_at, COALESCE(SUM(v.value), 0) AS score
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
        ${where}
        GROUP BY p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name, p.created_at, p.updated_at
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ?
        `,
        [...params, limit]
      );
      return res.json({ type, results: rows.map(toIso) });
    }

    if (type === "replies_text") {
      const params = [];
      let where = "";

      if (q) {
        where = "WHERE r.data LIKE ?";
        params.push(`%${q}%`);
      }

      const [rows] = await pool.query(
        `
        SELECT r.id, r.post_id, r.parent_reply_id, r.author_id, u.display_name AS author_name,
               r.data, r.created_at, COALESCE(SUM(v.value), 0) AS score
        FROM replies r
        LEFT JOIN users u ON r.author_id = u.id
        LEFT JOIN votes v ON v.target_type = 'reply' AND v.target_id = r.id
        ${where}
        GROUP BY r.id, r.post_id, r.parent_reply_id, r.author_id, u.display_name, r.data, r.created_at
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ?
        `,
        [...params, limit]
      );
      return res.json({ type, results: rows.map(replyToJson) });
    }

    if (type === "posts_by_author") {
      if (!q) {
        return jsonError(res, 400, "BadRequest", "q is required for posts_by_author");
      }

      const [rows] = await pool.query(
        `
        SELECT p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name AS author_name,
               p.created_at, p.updated_at, COALESCE(SUM(v.value), 0) AS score
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
        WHERE u.display_name LIKE ?
        GROUP BY p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name, p.created_at, p.updated_at
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ?
        `,
        [`%${q}%`, limit]
      );
      return res.json({ type, results: rows.map(toIso) });
    }

    if (type === "most_posts_users") {
      const [rows] = await pool.query(
        `
        SELECT u.id, u.display_name, COUNT(p.id) AS post_count
        FROM users u
        LEFT JOIN posts p ON p.author_id = u.id
        GROUP BY u.id, u.display_name
        ORDER BY post_count DESC, u.id ASC
        LIMIT ?
        `,
        [limit]
      );
      return res.json({ type, results: rows });
    }

    if (type === "least_posts_users") {
      const [rows] = await pool.query(
        `
        SELECT u.id, u.display_name, COUNT(p.id) AS post_count
        FROM users u
        LEFT JOIN posts p ON p.author_id = u.id
        GROUP BY u.id, u.display_name
        ORDER BY post_count ASC, u.id ASC
        LIMIT ?
        `,
        [limit]
      );
      return res.json({ type, results: rows });
    }

    if (type === "highest_voted_posts") {
      const params = [];
      let where = "";

      if (channelIdRaw !== undefined && channelIdRaw !== "") {
        const channelId = Number(channelIdRaw);
        if (!Number.isInteger(channelId) || channelId <= 0) {
          return jsonError(res, 400, "BadRequest", "channelId must be a positive integer");
        }
        where = "WHERE p.channel_id = ?";
        params.push(channelId);
      }

      const [rows] = await pool.query(
        `
        SELECT p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name AS author_name,
               p.created_at, p.updated_at, COALESCE(SUM(v.value), 0) AS score
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
        ${where}
        GROUP BY p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name, p.created_at, p.updated_at
        ORDER BY score DESC, p.created_at DESC, p.id DESC
        LIMIT ?
        `,
        [...params, limit]
      );
      return res.json({ type, results: rows.map(toIso) });
    }

    if (type === "lowest_voted_posts") {
      const params = [];
      let where = "";

      if (channelIdRaw !== undefined && channelIdRaw !== "") {
        const channelId = Number(channelIdRaw);
        if (!Number.isInteger(channelId) || channelId <= 0) {
          return jsonError(res, 400, "BadRequest", "channelId must be a positive integer");
        }
        where = "WHERE p.channel_id = ?";
        params.push(channelId);
      }

      const [rows] = await pool.query(
        `
        SELECT p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name AS author_name,
               p.created_at, p.updated_at, COALESCE(SUM(v.value), 0) AS score
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
        ${where}
        GROUP BY p.id, p.topic, p.data, p.channel_id, p.author_id, u.display_name, p.created_at, p.updated_at
        ORDER BY score ASC, p.created_at DESC, p.id DESC
        LIMIT ?
        `,
        [...params, limit]
      );
      return res.json({ type, results: rows.map(toIso) });
    }

    return jsonError(res, 400, "BadRequest", "unknown search type");
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return jsonError(res, 404, "NotFound", "user not found");
    }
    res.status(204).send();
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.delete("/api/admin/channels/:id", requireAdmin, async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const [result] = await pool.query("DELETE FROM channels WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return jsonError(res, 404, "NotFound", "channel not found");
    }
    res.status(204).send();
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.delete("/api/admin/posts/:id", requireAdmin, async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const [result] = await pool.query("DELETE FROM posts WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return jsonError(res, 404, "NotFound", "post not found");
    }
    res.status(204).send();
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.delete("/api/admin/replies/:id", requireAdmin, async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const [result] = await pool.query("DELETE FROM replies WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return jsonError(res, 404, "NotFound", "reply not found");
    }
    res.status(204).send();
  } catch (e) {
    console.error(e);
    jsonError(res, 500, "InternalServerError", "database error");
  }
});

app.use("/api", (req, res) => {
  jsonError(res, 404, "NotFound", "endpoint not found");
});

const port = Number(process.env.PORT || 3000);

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`backend listening on ${port}`);
    });
  })
  .catch((e) => {
    console.error("DB init failed:", e);
    process.exit(1);
  });