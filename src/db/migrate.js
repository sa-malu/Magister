const { query } = require("./postgres");

async function migrate() {
  // USERS
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      voice_seconds INTEGER NOT NULL DEFAULT 0,
      message_count INTEGER NOT NULL DEFAULT 0,
      last_message_xp BIGINT NOT NULL DEFAULT 0
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_voice ON users(voice_seconds DESC);`);

  // GIVEAWAYS
  await query(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      prize TEXT NOT NULL,
      winners INTEGER NOT NULL DEFAULT 1,
      ends_at BIGINT NOT NULL,
      created_by TEXT NOT NULL,
      ended INTEGER NOT NULL DEFAULT 0
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS giveaway_entries (
      giveaway_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (giveaway_id, user_id)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_giveaways_ends ON giveaways(ended, ends_at);`);

  // ROLE PANELS
  await query(`
    CREATE TABLE IF NOT EXISTS role_panels (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      role_ids TEXT NOT NULL,
      max_select INTEGER NOT NULL DEFAULT 1,
      title TEXT,
      description TEXT
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_role_panels_message ON role_panels(message_id);`);
}

module.exports = { migrate };