const { query } = require("../db/postgres");
const crypto = require("crypto");

function makeId() {
  return crypto.randomBytes(8).toString("hex");
}

async function countPanels(guildId) {
  const { rows } = await query(`SELECT COUNT(*)::int AS c FROM role_panels WHERE guild_id = $1`, [guildId]);
  return rows[0]?.c ?? 0;
}

async function listPanels(guildId) {
  const { rows } = await query(
    `SELECT id, channel_id, message_id, max_select, title
     FROM role_panels
     WHERE guild_id = $1
     ORDER BY id DESC`,
    [guildId]
  );
  return rows;
}

async function createPanel({ guildId, channelId, messageId, roleIds, maxSelect, title, description }) {
  const id = makeId();
  await query(
    `INSERT INTO role_panels (id, guild_id, channel_id, message_id, role_ids, max_select, title, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, guildId, channelId, messageId, JSON.stringify(roleIds), maxSelect, title, description]
  );
  return id;
}

async function getPanel(id) {
  const { rows } = await query(`SELECT * FROM role_panels WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  return { ...rows[0], role_ids: JSON.parse(rows[0].role_ids) };
}

async function deletePanel(id) {
  await query(`DELETE FROM role_panels WHERE id = $1`, [id]);
}

module.exports = { countPanels, listPanels, createPanel, getPanel, deletePanel };