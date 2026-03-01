const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Mostra o avatar de alguém")
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("Pessoa para ver o avatar")
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("usuario") || interaction.user;

    const avatarUrl = user.displayAvatarURL({
      dynamic: true,
      size: 4096
    });

    const embed = new EmbedBuilder()
      .setTitle(`🖼 Avatar de ${user.username}`)
      .setImage(avatarUrl)
      .setColor("Blurple");

    await interaction.reply({ embeds: [embed] });
  }
};