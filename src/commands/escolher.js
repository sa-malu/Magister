const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("escolher")
    .setDescription("Escolhe uma opção aleatória")
    .addStringOption(o => o.setName("opcoes").setDescription("Separe por | (ex: pizza | lanche | sushi)").setRequired(true)),

  async execute(interaction) {
    const raw = interaction.options.getString("opcoes");
    const parts = raw.split("|").map(s => s.trim()).filter(Boolean);

    if (parts.length < 2) {
      return interaction.reply({ content: "Coloque pelo menos 2 opções separadas por `|`.", flags: MessageFlags.Ephemeral });
    }

    const pick = parts[Math.floor(Math.random() * parts.length)];
    await interaction.reply({ content: `🎲 Eu escolho: **${pick}**` });
  }
};
