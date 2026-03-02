const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banner")
    .setDescription("Mostra o banner de alguém")
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("Pessoa para ver o banner")
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const target = interaction.options.getUser("usuario") || interaction.user;

    const user = await client.users.fetch(target.id, { force: true });

    if (!user.banner) {
      return interaction.reply({
        content: "Essa pessoa não tem banner configurado.",
        flags: MessageFlags.Ephemeral
      });
    }

    const bannerUrl = user.bannerURL({
      dynamic: true,
      size: 4096
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎨 Banner de ${user.username}`)
      .setImage(bannerUrl)
      .setColor("Random");

    await interaction.reply({ embeds: [embed] });
  }
};
