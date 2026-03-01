const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const xp = require("../services/xpService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Rankings do servidor")
    .addStringOption(o =>
      o.setName("tipo")
        .setDescription("xp ou voz")
        .setRequired(true)
        .addChoices(
          { name: "XP", value: "xp" },
          { name: "Voz (tempo em call)", value: "voz" }
        )
    ),
  async execute(interaction) {
    const tipo = interaction.options.getString("tipo");
    const guild = interaction.guild;

    const embed = new EmbedBuilder().setTitle(tipo === "xp" ? "🏆 Rank XP" : "🏆 Rank Voz");

    if (tipo === "xp") {
      const rows = await xp.topXp(10);  
      const lines = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const m = await guild.members.fetch(r.user_id).catch(() => null);
        const name = m?.user?.username ?? r.user_id;
        lines.push(`${i + 1}. **${name}** — Nível ${r.level} (${r.xp} XP)`);
      }
      embed.setDescription(lines.join("\n") || "Sem dados ainda.");
    } else {
      const rows = await xp.topVoice(10);
      const lines = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const m = await guild.members.fetch(r.user_id).catch(() => null);
        const name = m?.user?.username ?? r.user_id;
        const hours = Math.floor(r.voice_seconds / 3600);
        const mins = Math.floor((r.voice_seconds % 3600) / 60);
        lines.push(`${i + 1}. **${name}** — ${hours}h ${mins}m`);
      }
      embed.setDescription(lines.join("\n") || "Sem dados ainda.");
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};