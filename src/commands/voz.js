const { SlashCommandBuilder, ChannelType, PermissionsBitField, MessageFlags } = require("discord.js");

function getUserVoiceChannel(interaction) {
  const ch = interaction.member.voice?.channel;
  return ch && ch.type === ChannelType.GuildVoice ? ch : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("voz")
    .setDescription("Comandos inteligentes para calls")
    .addSubcommand(sub => sub.setName("sortear").setDescription("Sorteia alguém da sua call atual (somente humanos)"))
    .addSubcommand(sub =>
      sub.setName("times")
        .setDescription("Divide a call em times (não move)")
        .addIntegerOption(o => o.setName("qtd").setDescription("2, 3 ou 4").setRequired(true).addChoices(
          { name: "2", value: 2 }, { name: "3", value: 3 }, { name: "4", value: 4 }
        ))
    )
    .addSubcommand(sub =>
      sub.setName("mover_todos")
        .setDescription("Move todos da sua call atual para outra call")
        .addChannelOption(o => o.setName("destino").setDescription("Canal de voz destino").setRequired(true).addChannelTypes(ChannelType.GuildVoice))
    )
    .addSubcommand(sub =>
      sub.setName("puxar")
        .setDescription("Puxa um usuário para sua call atual")
        .addUserOption(o => o.setName("usuario").setDescription("Quem puxar").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("expulsar")
        .setDescription("Expulsa um usuário da call (desconecta)")
        .addUserOption(o => o.setName("usuario").setDescription("Quem expulsar").setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const voice = getUserVoiceChannel(interaction);
    if (!voice) return interaction.reply({ content: "Você precisa estar em uma call de voz.", flags: MessageFlags.Ephemeral });

    const humans = [...voice.members.values()].filter(m => !m.user.bot);
    if (humans.length < 2) {
      return interaction.reply({ content: "Precisa ter pelo menos **2 humanos** na call.", flags: MessageFlags.Ephemeral });
    }

    if (sub === "sortear") {
      const pick = humans[Math.floor(Math.random() * humans.length)];
      return interaction.reply({ content: `🎲 Sorteado da call **${voice.name}**: ${pick}` });
    }

    if (sub === "times") {
      const qtd = interaction.options.getInteger("qtd");

      // shuffle
      const arr = [...humans];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }

      const teams = Array.from({ length: qtd }, () => []);
      arr.forEach((m, idx) => teams[idx % qtd].push(m));

      const text = teams
        .map((t, i) => `**Time ${i + 1}:** ${t.map(m => m.toString()).join(", ") || "—"}`)
        .join("\n");

      return interaction.reply({ content: `🏁 Times na call **${voice.name}**:\n${text}` });
    }

    // mover/puxar/expulsar precisam Move Members
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
      return interaction.reply({ content: "Você precisa de permissão **Mover Membros**.", flags: MessageFlags.Ephemeral });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
      return interaction.reply({ content: "Eu não tenho permissão **Mover Membros**.", flags: MessageFlags.Ephemeral });
    }

    if (sub === "mover_todos") {
      const dest = interaction.options.getChannel("destino");
      const targets = [...voice.members.values()].filter(m => !m.user.bot);

      for (const m of targets) {
        await m.voice.setChannel(dest).catch(() => {});
      }
      return interaction.reply({ content: `✅ Movi **${targets.length}** pessoa(s) para **${dest.name}**.` });
    }

    if (sub === "puxar") {
      const user = interaction.options.getUser("usuario");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member || member.user.bot) return interaction.reply({ content: "Usuário inválido.", flags: MessageFlags.Ephemeral });
      if (!member.voice?.channel) return interaction.reply({ content: "Essa pessoa não está em call.", flags: MessageFlags.Ephemeral });

      await member.voice.setChannel(voice).catch(() => {});
      return interaction.reply({ content: `✅ Puxei ${member} para **${voice.name}**.` });
    }

    if (sub === "expulsar") {
      const user = interaction.options.getUser("usuario");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member || member.user.bot) return interaction.reply({ content: "Usuário inválido.", flags: MessageFlags.Ephemeral });
      if (!member.voice?.channel) return interaction.reply({ content: "Essa pessoa não está em call.", flags: MessageFlags.Ephemeral });

      await member.voice.setChannel(null).catch(() => {});
      return interaction.reply({ content: `✅ Desconectei ${member} da call.` });
    }
  }
};
