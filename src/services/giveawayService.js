const { query } = require("../db/postgres");
const crypto = require("crypto");

function makeId() {
  return crypto.randomBytes(8).toString("hex");
}

async function createGiveaway({ guildId, channelId, prize, winners, endsAt, createdBy }) {
  const id = makeId();
  await query(
    `INSERT INTO giveaways (id, guild_id, channel_id, prize, winners, ends_at, created_by, ended)
     VALUES ($1,$2,$3,$4,$5,$6,$7,0)`,
    [id, guildId, channelId, prize, winners, endsAt, createdBy]
  );
  return id;
}

async function setMessageId(id, messageId) {
  await query(`UPDATE giveaways SET message_id = $1 WHERE id = $2`, [messageId, id]);
}

async function getGiveaway(id) {
  const { rows } = await query(`SELECT * FROM giveaways WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function addEntry(id, userId) {
  await query(
    `INSERT INTO giveaway_entries (giveaway_id, user_id)
     VALUES ($1,$2)
     ON CONFLICT (giveaway_id, user_id) DO NOTHING`,
    [id, userId]
  );
}

async function countEntries(id) {
  const { rows } = await query(`SELECT COUNT(*)::int AS c FROM giveaway_entries WHERE giveaway_id = $1`, [id]);
  return rows[0]?.c ?? 0;
}

async function listEntries(id) {
  const { rows } = await query(`SELECT user_id FROM giveaway_entries WHERE giveaway_id = $1`, [id]);
  return rows.map(r => r.user_id);
}

async function markEnded(id) {
  await query(`UPDATE giveaways SET ended = 1 WHERE id = $1`, [id]);
}

async function getDueGiveaways(nowMs) {
  const { rows } = await query(
    `SELECT * FROM giveaways
     WHERE ended = 0 AND ends_at <= $1
     ORDER BY ends_at ASC
     LIMIT 20`,
    [nowMs]
  );
  return rows;
}

function pickWinners(entries, winnersCount) {
  // entries pode ser:
  // - array de strings/ids: ["123", "456"]
  // - array de objetos do banco: [{ user_id: "123" }, { user_id: "456" }]
  // - Set de ids

  const ids = (() => {
    if (!entries) return [];
    if (entries instanceof Set) return [...entries];
    if (!Array.isArray(entries)) return [];

    // array de objetos?
    if (entries.length && typeof entries[0] === "object" && entries[0] !== null) {
      return entries
        .map(e => e.user_id ?? e.userId ?? e.id) // tenta campos comuns
        .filter(Boolean)
        .map(String);
    }

    // array simples de ids
    return entries.filter(Boolean).map(String);
  })();

  const unique = [...new Set(ids)];
  const n = Math.max(0, Math.min(Number(winnersCount) || 1, unique.length));

  // shuffle simples
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  return unique.slice(0, n);
}

module.exports = {
  createGiveaway,
  setMessageId,
  getGiveaway,
  addEntry,
  countEntries,
  listEntries,
  markEnded,
  getDueGiveaways,
  pickWinners,
};
