const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chance(p) {
  return Math.random() < p;
}

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

  const uploadsDir = path.resolve(__dirname, "uploads");
  const picsDir = path.resolve(__dirname, "../pics");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // -----------------------------
  // 1. Refuse to seed unless empty
  // -----------------------------
  const [[postsCountRow]] = await pool.query(`SELECT COUNT(*) AS c FROM posts`);
  const [[usersCountRow]] = await pool.query(`SELECT COUNT(*) AS c FROM users WHERE username <> 'admin'`);
  const [[channelsCountRow]] = await pool.query(`SELECT COUNT(*) AS c FROM channels WHERE name <> 'General'`);
  const [[repliesCountRow]] = await pool.query(`SELECT COUNT(*) AS c FROM replies`);
  const [[attachmentsCountRow]] = await pool.query(`SELECT COUNT(*) AS c FROM attachments`);

  const totalExisting =
    postsCountRow.c +
    usersCountRow.c +
    channelsCountRow.c +
    repliesCountRow.c +
    attachmentsCountRow.c;

  if (totalExisting > 0) {
    console.log("Seed aborted: database is not empty.");
    console.log("This seed script only runs on an empty app state.");
    await pool.end();
    return;
  }

  if (!fs.existsSync(picsDir)) {
    throw new Error(`pics folder not found: ${picsDir}`);
  }

  // -----------------------------
  // 2. Define themed channels
  // -----------------------------
  const channelDefs = [
    {
      name: "Attack on Titan",
      slug: "aot",
      keywords: ["aot"],
      topics: [
        "Best arc in Attack on Titan?",
        "Thoughts on Eren's choices",
        "Favorite Levi moment",
        "Was the ending satisfying?",
        "Best fight scene in AOT?"
      ],
      bodies: [
        "I wanted to start a discussion about this part of the series.",
        "This scene keeps coming back to me.",
        "I think there are multiple ways to interpret this.",
        "The writing here is stronger than people give it credit for.",
        "What do you all think about this character arc?"
      ]
    },
    {
      name: "Succession",
      slug: "succession",
      keywords: ["succession"],
      topics: [
        "Who was the smartest Roy?",
        "Best Succession episode?",
        "Tom and Greg dynamic discussion",
        "Was Logan ever actually fair?",
        "Most brutal line in Succession?"
      ],
      bodies: [
        "This show is unbelievably sharp on rewatch.",
        "The dialogue is half the appeal for me.",
        "Every character is terrible and that is why it works.",
        "I keep changing my mind on who played the game best.",
        "The tension in these scenes is incredible."
      ]
    },
    {
      name: "Artemis Mission",
      slug: "artemis",
      keywords: ["artemis"],
      topics: [
        "What excites you most about Artemis?",
        "Moon mission discussion thread",
        "Artemis program and future of space",
        "Is lunar return worth the cost?",
        "Best Artemis photo so far?"
      ],
      bodies: [
        "Space exploration still feels bigger than politics to me.",
        "The imagery and engineering are both fascinating.",
        "A moon return could set up much bigger goals later.",
        "There is a real sense of historical continuation here.",
        "I like following both the science and the logistics."
      ]
    },
    {
      name: "Cooking",
      slug: "cooking",
      keywords: ["cooking"],
      topics: [
        "Quick dinner ideas?",
        "Best beginner cooking tips",
        "What are you making this week?",
        "Favorite comfort food recipe",
        "How do you level up basic meals?"
      ],
      bodies: [
        "Trying to get better at simple home cooking.",
        "I want ideas that are practical and realistic.",
        "Good food does not have to be complicated.",
        "Curious what people actually make regularly.",
        "Looking for something tasty and repeatable."
      ]
    },
    {
      name: "Space",
      slug: "space",
      keywords: ["artemis", "space"],
      topics: [
        "Most underrated space mission?",
        "Favorite photo of Earth from orbit",
        "Why space still matters",
        "What should come after the Moon?",
        "Best science topic to learn next?"
      ],
      bodies: [
        "I can read about this stuff for hours.",
        "The visuals alone make the topic worth following.",
        "There is something humbling about these images.",
        "It changes how you think about scale and time.",
        "Space combines science, engineering, and imagination perfectly."
      ]
    },
    {
      name: "Movies",
      slug: "movies",
      keywords: [],
      topics: [
        "Best movie you watched recently?",
        "Favorite ending in film",
        "Underrated performances thread",
        "Movie recommendation exchange",
        "What makes a film rewatchable?"
      ],
      bodies: [
        "I like movies with strong character work.",
        "A great ending can elevate everything before it.",
        "Some films get better every time you revisit them.",
        "Curious what people here keep going back to.",
        "Trying to find something worth watching tonight."
      ]
    },
    {
      name: "Anime",
      slug: "anime",
      keywords: ["aot"],
      topics: [
        "Anime that surprised you",
        "Best first episode in anime",
        "Most intense anime moment",
        "Underrated anime recommendations",
        "What anime aged the best?"
      ],
      bodies: [
        "Sometimes one scene is enough to hook you forever.",
        "A strong first episode changes everything.",
        "I like stories with momentum and payoff.",
        "Looking for something serious and high quality.",
        "Curious what people consider modern classics."
      ]
    },
    {
      name: "Tech",
      slug: "tech",
      keywords: [],
      topics: [
        "Best productivity tool right now?",
        "What tech are you learning?",
        "Most useful app you use daily",
        "What should I build next?",
        "What is underrated in tech?"
      ],
      bodies: [
        "Trying to focus on skills with practical use.",
        "I prefer stuff that is powerful but simple.",
        "Tech gets more interesting when you actually build things.",
        "Looking for ideas worth investing time into.",
        "Curious what people here find genuinely useful."
      ]
    },
    {
      name: "Programming",
      slug: "programming",
      keywords: [],
      topics: [
        "How do you debug faster?",
        "Favorite language right now?",
        "Best programming habit to build",
        "How do you structure projects?",
        "What makes code readable?"
      ],
      bodies: [
        "I want habits that make me better long term.",
        "Readable code matters more than clever code.",
        "Project structure is half the battle.",
        "Curious how different people approach this.",
        "Trying to improve both speed and clarity."
      ]
    },
    {
      name: "Gaming",
      slug: "gaming",
      keywords: [],
      topics: [
        "Game you keep returning to?",
        "Best game soundtrack?",
        "What makes a game addictive?",
        "Most immersive game world",
        "Favorite game mechanic discussion"
      ],
      bodies: [
        "Good games stay with you longer than expected.",
        "I like games with atmosphere and identity.",
        "Soundtrack can completely transform the experience.",
        "Some mechanics just feel timeless.",
        "Curious what people here keep playing."
      ]
    },
    {
      name: "History",
      slug: "history",
      keywords: [],
      topics: [
        "Historical period you want to study more",
        "Most misunderstood empire?",
        "Favorite history book",
        "Best historical documentary?",
        "Which event changed the world most?"
      ],
      bodies: [
        "History gets better the deeper you go.",
        "A lot of popular understanding is too shallow.",
        "The context around events matters a lot.",
        "Trying to find a good rabbit hole to go down.",
        "There is always more complexity than first appears."
      ]
    },
    {
      name: "Politics",
      slug: "politics",
      keywords: [],
      topics: [
        "Policy discussion thread",
        "Biggest political issue right now?",
        "What shapes public opinion most?",
        "Politics and media discussion",
        "How do you evaluate leadership?"
      ],
      bodies: [
        "Trying to keep this focused and thoughtful.",
        "A lot of politics is really incentives and institutions.",
        "The media side of this matters a lot too.",
        "Interested in serious discussion, not slogans.",
        "There are always second-order effects people ignore."
      ]
    },
    {
      name: "Fitness",
      slug: "fitness",
      keywords: [],
      topics: [
        "How do you stay consistent?",
        "Best beginner fitness advice",
        "Workout routine discussion",
        "Favorite cardio method",
        "What actually keeps you disciplined?"
      ],
      bodies: [
        "Consistency matters more than intensity at first.",
        "Trying to focus on habits that last.",
        "Curious what actually works for real people.",
        "Motivation fades, systems matter more.",
        "Looking for practical advice."
      ]
    },
    {
      name: "Books",
      slug: "books",
      keywords: [],
      topics: [
        "Best book you read this year",
        "What book changed your thinking?",
        "Favorite fiction recommendation",
        "Best nonfiction for beginners?",
        "What makes a book memorable?"
      ],
      bodies: [
        "A good book can reframe how you see things.",
        "Trying to find something worth spending real time on.",
        "I like books that are both smart and readable.",
        "Curious what actually stuck with people.",
        "Recommendations welcome."
      ]
    },
    {
      name: "Design",
      slug: "design",
      keywords: [],
      topics: [
        "What makes UI feel modern?",
        "Favorite app design right now",
        "How do you improve visual hierarchy?",
        "What ruins good design?",
        "Design inspiration thread"
      ],
      bodies: [
        "I like design that feels clear and intentional.",
        "Small details change everything.",
        "A polished UI often comes down to rhythm and spacing.",
        "Curious what other people notice first.",
        "Trying to build things that feel less clunky."
      ]
    },
    {
      name: "General Chat",
      slug: "general",
      keywords: [],
      topics: [
        "What are you working on?",
        "Random discussion thread",
        "What are you watching lately?",
        "Weekend plans thread",
        "What is on your mind today?"
      ],
      bodies: [
        "Just opening this up for general discussion.",
        "Thought this would be a good place to chat.",
        "Curious what everyone is up to.",
        "No strict topic, just conversation.",
        "Sometimes the best threads are the simplest."
      ]
    }
  ];

  // -----------------------------
  // 3. Create 30 users
  // -----------------------------
  const userIds = [];
  for (let i = 1; i <= 30; i++) {
    const username = `seeduser${i}`;
    const displayName = `Seed User ${i}`;
    const passwordHash = await bcrypt.hash("password123", 10);

    const [result] = await pool.query(
      `
      INSERT INTO users (display_name, username, password_hash, role)
      VALUES (?, ?, ?, 'user')
      `,
      [displayName, username, passwordHash]
    );

    userIds.push(result.insertId);
  }

  // -----------------------------
  // 4. Create 15 channels
  // -----------------------------
  const channelIdsBySlug = {};
  for (const ch of channelDefs) {
    const [result] = await pool.query(
      `INSERT INTO channels (name) VALUES (?)`,
      [ch.name]
    );
    channelIdsBySlug[ch.slug] = result.insertId;
  }

  // -----------------------------
  // 5. Read images and map by theme
  // -----------------------------
  const allPicFiles = fs
    .readdirSync(picsDir)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));

  const picsByTheme = {
    aot: allPicFiles.filter((f) => f.toLowerCase().startsWith("aot")),
    succession: allPicFiles.filter((f) => f.toLowerCase().startsWith("succession")),
    artemis: allPicFiles.filter((f) => f.toLowerCase().startsWith("artemis")),
    cooking: allPicFiles.filter((f) => f.toLowerCase().startsWith("cooking"))
  };

  const usedImageNames = new Set();

  // -----------------------------
// 6. Create around 250 posts
// -----------------------------
const postIds = [];
const postIdsByChannel = {};
const postAuthors = new Map();

for (const ch of channelDefs) {
  postIdsByChannel[ch.slug] = [];
}

const plainPosts = [];
const imagePosts = [];

// distribute 250 across 15 channels
const basePostsPerChannel = 16; // 15*16 = 240
let extraPosts = 10;

for (const ch of channelDefs) {
  let count = basePostsPerChannel;
  if (extraPosts > 0) {
    count += 1;
    extraPosts -= 1;
  }

  for (let i = 0; i < count; i++) {
    const topic = `${pick(ch.topics)} ${i + 1}`;
    const data = `${pick(ch.bodies)} ${pick(ch.bodies)}`;
    const authorId = pick(userIds);
    const channelId = channelIdsBySlug[ch.slug];

    let themeImage = null;

    if (ch.slug === "aot" || ch.slug === "anime") {
      themeImage = picsByTheme.aot.find((f) => !usedImageNames.has(f));
    } else if (ch.slug === "succession" || ch.slug === "movies") {
      themeImage = picsByTheme.succession.find((f) => !usedImageNames.has(f));
    } else if (ch.slug === "artemis" || ch.slug === "space") {
      themeImage = picsByTheme.artemis.find((f) => !usedImageNames.has(f));
    } else if (ch.slug === "cooking") {
      themeImage = picsByTheme.cooking.find((f) => !usedImageNames.has(f));
    }

    const postObj = {
      slug: ch.slug,
      topic,
      data,
      authorId,
      channelId,
      themeImage
    };

    if (themeImage) {
      usedImageNames.add(themeImage);
      imagePosts.push(postObj);
    } else {
      plainPosts.push(postObj);
    }
  }
}

// insert plain posts first
for (const post of plainPosts) {
  const [result] = await pool.query(
    `
    INSERT INTO posts (topic, data, channel_id, author_id)
    VALUES (?, ?, ?, ?)
    `,
    [post.topic, post.data, post.channelId, post.authorId]
  );

  const postId = result.insertId;
  postIds.push(postId);
  postIdsByChannel[post.slug].push(postId);
  postAuthors.set(postId, post.authorId);
}

// insert image posts last so they appear at top of Home
for (const post of imagePosts) {
  const [result] = await pool.query(
    `
    INSERT INTO posts (topic, data, channel_id, author_id)
    VALUES (?, ?, ?, ?)
    `,
    [post.topic, post.data, post.channelId, post.authorId]
  );

  const postId = result.insertId;
  postIds.push(postId);
  postIdsByChannel[post.slug].push(postId);
  postAuthors.set(postId, post.authorId);

  const src = path.join(picsDir, post.themeImage);
  const ext = path.extname(post.themeImage).toLowerCase();
  const copiedName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const dest = path.join(uploadsDir, copiedName);

  fs.copyFileSync(src, dest);

  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
      ? "image/webp"
      : "image/jpeg";

  const stat = fs.statSync(dest);

  await pool.query(
    `
    INSERT INTO attachments (target_type, target_id, file_path, mime_type, size)
    VALUES ('post', ?, ?, ?, ?)
    `,
    [postId, dest, mime, stat.size]
  );
}

  // -----------------------------
  // 7. Create replies and nested replies
  // -----------------------------
  const replyIds = [];
  const replyAuthors = new Map();

  // create first-level replies
  for (let i = 0; i < 420; i++) {
    const postId = pick(postIds);
    const authorId = pick(userIds);
    const body = pick([
      "I agree with this.",
      "Interesting point.",
      "I see it differently.",
      "That is actually a solid take.",
      "Can you explain more?",
      "This made me think.",
      "I did not see it that way before.",
      "Good post.",
      "That image fits the topic really well.",
      "I think there is more nuance here."
    ]);

    const [result] = await pool.query(
      `
      INSERT INTO replies (post_id, parent_reply_id, author_id, data)
      VALUES (?, NULL, ?, ?)
      `,
      [postId, authorId, body]
    );

    replyIds.push(result.insertId);
    replyAuthors.set(result.insertId, authorId);
  }

  // nested replies
  const nestedCount = 220;
  for (let i = 0; i < nestedCount; i++) {
    const parentReplyId = pick(replyIds);

    const [[parentRow]] = await pool.query(
      `SELECT post_id FROM replies WHERE id = ?`,
      [parentReplyId]
    );

    const authorId = pick(userIds);
    const body = pick([
      "Replying to your point here.",
      "I mostly agree with this reply.",
      "That is fair, but I would add something else.",
      "This chain is getting interesting.",
      "I think the parent comment is right.",
      "Not sure I agree completely.",
      "That depends on how you interpret it.",
      "There is a stronger argument on the other side too."
    ]);

    const [result] = await pool.query(
      `
      INSERT INTO replies (post_id, parent_reply_id, author_id, data)
      VALUES (?, ?, ?, ?)
      `,
      [parentRow.post_id, parentReplyId, authorId, body]
    );

    replyIds.push(result.insertId);
    replyAuthors.set(result.insertId, authorId);
  }

  // -----------------------------
  // 8. Create random votes
  // -----------------------------
  for (const userId of userIds) {
    const votedPosts = new Set();
    const votedReplies = new Set();

    const postVoteCount = randInt(35, 80);
    const replyVoteCount = randInt(25, 70);

    for (let i = 0; i < postVoteCount; i++) {
      const postId = pick(postIds);
      const key = String(postId);
      if (votedPosts.has(key)) continue;
      votedPosts.add(key);

      const value = pick([1, 1, 1, 1, -1, -1, 0]);

      if (value === 0) continue;

      await pool.query(
        `
        INSERT INTO votes (user_id, target_type, target_id, value)
        VALUES (?, 'post', ?, ?)
        ON DUPLICATE KEY UPDATE value = VALUES(value)
        `,
        [userId, postId, value]
      );
    }

    for (let i = 0; i < replyVoteCount; i++) {
      const replyId = pick(replyIds);
      const key = String(replyId);
      if (votedReplies.has(key)) continue;
      votedReplies.add(key);

      const value = pick([1, 1, 1, -1, -1, 0]);

      if (value === 0) continue;

      await pool.query(
        `
        INSERT INTO votes (user_id, target_type, target_id, value)
        VALUES (?, 'reply', ?, ?)
        ON DUPLICATE KEY UPDATE value = VALUES(value)
        `,
        [userId, replyId, value]
      );
    }
  }

  console.log("Seed complete.");
  console.log(`Users created: ${userIds.length}`);
  console.log(`Channels created: ${channelDefs.length}`);
  console.log(`Posts created: ${postIds.length}`);
  console.log(`Replies created: ${replyIds.length}`);
  console.log(`Images attached: ${usedImageNames.size}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});