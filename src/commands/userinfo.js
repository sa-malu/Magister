const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Mostra informações de um usuário")
    .addUserOption(o => o.setName("usuario").setDescription("Quem ver").setRequired(false)),

  async execute(interaction) {
    const member = interaction.options.getMember("usuario") || interaction.member;
    const user = member.user;

    const roles = member.roles.cache
      .filter(r => r.id !== interaction.guild.roles.everyone.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString());

    const voice = member.voice?.channel ? member.voice.channel.name : "—";

    const embed = new EmbedBuilder()
      .setTitle(`ℹ️ Userinfo: ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: "🆔 ID", value: user.id, inline: true },
        { name: "📅 Conta criada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: "📥 Entrou no servidor", value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "—", inline: true },
        { name: "🔊 Call", value: voice, inline: true },
        { name: "🎭 Cargos", value: roles.slice(0, 15).join(" ") || "—" }
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
