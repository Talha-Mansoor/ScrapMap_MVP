CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  password_hash VARCHAR(255),
  display_name VARCHAR(100),
  role VARCHAR(20)
);

CREATE TABLE channels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE
);

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic VARCHAR(255),
  data TEXT,
  channel_id INT,
  author_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT,
  parent_reply_id INT,
  author_id INT,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  target_type VARCHAR(20),
  target_id INT,
  value INT
);

CREATE TABLE attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_type VARCHAR(20),
  target_id INT,
  file_path VARCHAR(255),
  mime_type VARCHAR(100),
  size INT
);