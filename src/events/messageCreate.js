const xp = require("../services/xpService");

module.exports = {
  name: "messageCreate",
  async execute(message, client, config) {
    if (!message.guild) return;
    if (message.guild.id !== config.guildId) return;
    if (message.author.bot) return;

    await xp.addMessage(message.author.id);

    const now = Date.now();
    const ok = await xp.canGetMsgXp(message.author.id, now, config.xp.msgCooldownSec);
    if (!ok) return;

    const content = (message.content || "").trim();
    if (content.length < 3) return;

    await xp.stampMsgXp(message.author.id, now);
    await xp.addXp(message.author.id, config.xp.msg);
  },
};