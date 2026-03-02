const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const giveaway = require("../services/giveawayService");

function parseDurationToMs(str) {
  // exemplos: 10m, 2h, 1d
  const m = /^(\d+)\s*([mhd])$/i.exec((str || "").trim());
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === "m") return n * 60_000;
  if (u === "h") return n * 3_600_000;
  if (u === "d") return n * 86_400_000;
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorteio")
    .setDescription("Sistema de sorteio")
    .addSubcommand(sub =>
      sub.setName("criar")
        .setDescription("Cria um sorteio com botão de participar")
        .addStringOption(o => o.setName("premio").setDescription("Prêmio").setRequired(true))
        .addStringOption(o => o.setName("duracao").setDescription("Ex: 10m, 2h, 1d").setRequired(true))
        .addIntegerOption(o => o.setName("ganhadores").setDescription("Quantidade de ganhadores (1-10)").setMinValue(1).setMaxValue(10))
    )
    .addSubcommand(sub =>
      sub.setName("encerrar")
        .setDescription("Encerra um sorteio agora")
        .addStringOption(o => o.setName("id").setDescription("ID do sorteio").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("reroll")
        .setDescription("Rola novamente os vencedores (depois de encerrado)")
        .addStringOption(o => o.setName("id").setDescription("ID do sorteio").setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "criar") {
      const prize = interaction.options.getString("premio");
      const dur = interaction.options.getString("duracao");
      const winners = interaction.options.getInteger("ganhadores") ?? 1;

      const ms = parseDurationToMs(dur);
      if (!ms || ms < 60_000) {
        return interaction.reply({ content: "Duração inválida. Use `10m`, `2h` ou `1d` (mínimo 1m).", flags: MessageFlags.Ephemeral });
      }

      const endsAt = Date.now() + ms;
      const id = await giveaway.createGiveaway({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        prize,
        winners,
        endsAt,
        createdBy: interaction.user.id,
      });

      const embed = new EmbedBuilder()
        .setTitle("🎁 Sorteio!")
        .setDescription(`**Prêmio:** ${prize}\n**Ganhadores:** ${winners}\n**Termina:** <t:${Math.floor(endsAt / 1000)}:R>\n\n**ID:** \`${id}\``);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gw:join:${id}`)
          .setLabel("Participar")
          .setStyle(ButtonStyle.Primary)
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      giveaway.setMessageId(id, msg.id);

      return;
    }

    const id = interaction.options.getString("id");
    const gw = giveaway.getGiveaway(id);
    if (!gw) return interaction.reply({ content: "Sorteio não encontrado.", flags: MessageFlags.Ephemeral });

    const entries = giveaway.listEntries(id);

    if (sub === "encerrar") {
      if (gw.ended) return interaction.reply({ content: "Esse sorteio já está encerrado.", flags: MessageFlags.Ephemeral });

      const winnersIds = giveaway.pickWinners(entries, gw.winners);
      giveaway.markEnded(id);

      if (!winnersIds.length) {
        await interaction.reply({ content: `🎁 **Sorteio encerrado:** ${gw.prize}\nNinguém participou 😿` });
      } else {
        const mentions = winnersIds.map(uid => `<@${uid}>`).join(", ");
        await interaction.reply({ content: `🎉 **Sorteio encerrado:** ${gw.prize}\n🏆 Vencedor(es): ${mentions}` });
      }
      return;
    }

    if (sub === "reroll") {
      if (!gw.ended) return interaction.reply({ content: "Você só pode usar reroll depois de encerrar o sorteio.", flags: MessageFlags.Ephemeral });
      if (!entries.length) return interaction.reply({ content: "Não há participantes pra reroll.", flags: MessageFlags.Ephemeral });

      const winnersIds = giveaway.pickWinners(entries, gw.winners);
      const mentions = winnersIds.map(uid => `<@${uid}>`).join(", ");

      await interaction.reply({ content: `🔁 **Reroll:** ${gw.prize}\n🏆 Novo(s) vencedor(es): ${mentions}` });
    }
  }
};
