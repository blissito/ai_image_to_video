-- Tabla única que replica exactamente la estructura JSON
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  credits INTEGER DEFAULT 0,
  video_ids TEXT DEFAULT '[]', -- JSON array as string
  bucket_links TEXT DEFAULT '[]', -- JSON array as string
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);