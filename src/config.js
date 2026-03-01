require("dotenv").config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Faltou variável: ${name}`);
  return v;
}

module.exports = {
  token: must("DISCORD_TOKEN"),
  guildId: must("GUILD_ID"),
  tempVoiceCategoryId: must("TEMP_VOICE_CATEGORY_ID"),

  xp: {
    voicePerMin: Number(process.env.XP_VOICE_PER_MIN ?? 2),
    msg: Number(process.env.XP_MSG ?? 6),
    msgCooldownSec: Number(process.env.XP_MSG_COOLDOWN_SEC ?? 20)
  },

  call: {
    maxBatch: Number(process.env.CALL_MAX_BATCH ?? 5),
    defaultMinutes: Number(process.env.CALL_DEFAULT_MINUTES ?? 60),
    deleteIfEmpty: String(process.env.CALL_DELETE_IF_EMPTY ?? "true") === "true"
  }
};