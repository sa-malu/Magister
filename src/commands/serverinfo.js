const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Mostra informações do servidor"),

  async execute(interaction) {
    const g = interaction.guild;

    const total = g.memberCount;
    const channels = g.channels.cache.size;
    const roles = g.roles.cache.size;

    const embed = new EmbedBuilder()
      .setTitle(`🏛️ Serverinfo: ${g.name}`)
      .setThumbnail(g.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: "🆔 ID", value: g.id, inline: true },
        { name: "👥 Membros", value: String(total), inline: true },
        { name: "📺 Canais", value: String(channels), inline: true },
        { name: "🎭 Cargos", value: String(roles), inline: true },
        { name: "📅 Criado em", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>`, inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};