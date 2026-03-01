const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timer")
    .setDescription("Cria um timer e avisa quando acabar")
    .addIntegerOption(o => o.setName("minutos").setDescription("Minutos (1-1440)").setMinValue(1).setMaxValue(1440).setRequired(true))
    .addStringOption(o => o.setName("motivo").setDescription("Opcional").setRequired(false)),

  async execute(interaction) {
    const min = interaction.options.getInteger("minutos");
    const motivo = interaction.options.getString("motivo") || "—";
    const endsAt = Date.now() + min * 60_000;

    await interaction.reply({ content: `⏱️ Timer iniciado por ${interaction.user} — **${min} min** (motivo: ${motivo})` });

    setTimeout(async () => {
      try {
        await interaction.channel.send(`⏰ ${interaction.user} seu timer acabou! (motivo: ${motivo})`);
      } catch {}
    }, min * 60_000);
  }
};