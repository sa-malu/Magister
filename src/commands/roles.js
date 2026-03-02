const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Lista os cargos de um usuário")
    .addUserOption(o => o.setName("usuario").setDescription("Quem ver").setRequired(false)),

  async execute(interaction) {
    const member = interaction.options.getMember("usuario") || interaction.member;

    const roles = member.roles.cache
      .filter(r => r.id !== interaction.guild.roles.everyone.id)
      .sort((a, b) => b.position - a.position);

    const embed = new EmbedBuilder()
      .setTitle(`🎭 Cargos de ${member.user.username}`)
      .setDescription(roles.map(r => r.toString()).join(" ") || "—");

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
