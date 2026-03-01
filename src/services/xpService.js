const { query } = require("../db/postgres");

function xpNeededForNext(level) {
  return 100 * (level + 1);
}

async function ensureUser(userId) {
  await query(
    `INSERT INTO users (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getUser(userId) {
  await ensureUser(userId);
  const { rows } = await query(`SELECT * FROM users WHERE user_id = $1`, [userId]);
  return rows[0];
}

async function addMessage(userId) {
  await ensureUser(userId);
  await query(`UPDATE users SET message_count = message_count + 1 WHERE user_id = $1`, [userId]);
}

async function canGetMsgXp(userId, nowMs, cooldownSec) {
  await ensureUser(userId);
  const { rows } = await query(`SELECT last_message_xp FROM users WHERE user_id = $1`, [userId]);
  const last = Number(rows[0]?.last_message_xp ?? 0);
  return nowMs - last >= cooldownSec * 1000;
}

async function stampMsgXp(userId, nowMs) {
  await ensureUser(userId);
  await query(`UPDATE users SET last_message_xp = $1 WHERE user_id = $2`, [nowMs, userId]);
}

async function addVoiceSeconds(userId, seconds) {
  await ensureUser(userId);
  await query(`UPDATE users SET voice_seconds = voice_seconds + $1 WHERE user_id = $2`, [seconds, userId]);
}

async function addXp(userId, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return { leveledUp: false };

  const row = await getUser(userId);

  let xp = Number(row.xp) + Math.floor(amount);
  let level = Number(row.level);
  let leveledUp = false;

  while (xp >= xpNeededForNext(level)) {
    xp -= xpNeededForNext(level);
    level += 1;
    leveledUp = true;
  }

  await query(`UPDATE users SET xp = $1, level = $2 WHERE user_id = $3`, [xp, level, userId]);
  return { leveledUp, level };
}

async function topXp(limit = 10) {
  const { rows } = await query(
    `SELECT user_id, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

async function topVoice(limit = 10) {
  const { rows } = await query(
    `SELECT user_id, voice_seconds FROM users ORDER BY voice_seconds DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = {
  xpNeededForNext,
  getUser,
  addMessage,
  canGetMsgXp,
  stampMsgXp,
  addVoiceSeconds,
  addXp,
  topXp,
  topVoice,
};