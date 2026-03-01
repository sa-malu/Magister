const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const xp = require("../services/xpService");

function fmtTime(totalSeconds) {
  const s = Math.max(0, totalSeconds | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Mostra seu perfil (XP/nível/voz/mensagens)")
    .addUserOption(o => o.setName("usuario").setDescription("Ver de outra pessoa").setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser("usuario") || interaction.user;
    const row = await xp.getUser(user.id);

    const embed = new EmbedBuilder()
      .setTitle(`👤 Perfil de ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "⭐ Nível", value: String(row.level), inline: true },
        { name: "✨ XP", value: String(row.xp), inline: true },
        { name: "🔊 Tempo em call", value: fmtTime(row.voice_seconds), inline: true },
        { name: "💬 Mensagens", value: String(row.message_count), inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};