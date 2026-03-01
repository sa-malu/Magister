const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require("discord.js");

function addUserBatch(sub, count) {
  for (let i = 1; i <= count; i++) {
    sub.addUserOption(o =>
      o.setName(`usuario${i}`)
        .setDescription(`Usuário ${i}`)
        .setRequired(i === 1)
    );
  }
  return sub;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("call")
    .setDescription("Calls temporárias (categoria fixa)")
    .addSubcommand(sub =>
      sub.setName("criar")
        .setDescription("Cria uma call temporária (visível, só convidados conectam)")
        .addStringOption(o => o.setName("nome").setDescription("Nome da call").setRequired(true))
        .addIntegerOption(o => o.setName("minutos").setDescription("Duração (padrão do config)").setMinValue(5).setMaxValue(720))
    )
    .addSubcommand(sub => addUserBatch(
      sub.setName("convidar").setDescription("Libera acesso para até 5 pessoas"),
      5
    ))
    .addSubcommand(sub => addUserBatch(
      sub.setName("remover").setDescription("Remove acesso de até 5 pessoas"),
      5
    ))
    .addSubcommand(sub =>
      sub.setName("fechar").setDescription("Fecha (deleta) sua call temporária")
    ),

  async execute(interaction, client, config) {
    const sub = interaction.options.getSubcommand();
    const ownerId = interaction.user.id;
    const guild = interaction.guild;

    // só quem tem perm de gerenciar canais
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: "Você precisa de **Gerenciar Canais**.", ephemeral: true });
    }

    const my = client.tempCalls.get(ownerId);

    if (sub === "criar") {
      if (my) return interaction.reply({ content: "Você já tem uma call ativa. Use `/call fechar`.", ephemeral: true });

      const parent = await guild.channels.fetch(config.tempVoiceCategoryId).catch(() => null);
      if (!parent || parent.type !== ChannelType.GuildCategory) {
        return interaction.reply({ content: "A categoria configurada não existe ou não é categoria.", ephemeral: true });
      }

      const nome = interaction.options.getString("nome");
      const minutos = interaction.options.getInteger("minutos") ?? config.call.defaultMinutes;

      const ch = await guild.channels.create({
        name: nome,
        type: ChannelType.GuildVoice,
        parent: parent.id,
        permissionOverwrites: [
          // Todo mundo vê, mas não conecta
          {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
            deny: [PermissionsBitField.Flags.Connect]
          },
          // Dono conecta e gerencia
          {
            id: ownerId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MoveMembers,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.DeafenMembers
            ]
          }
        ]
      });

      client.tempCalls.set(ownerId, {
        channelId: ch.id,
        guildId: guild.id,
        expiresAt: Date.now() + minutos * 60_000,
        deleteIfEmpty: config.call.deleteIfEmpty
      });

      return interaction.reply({
        content: `✅ Call criada em **${parent.name}**: **${ch.name}** (dura ${minutos} min)\nUse **/call convidar** para liberar acesso.`,
        ephemeral: true
      });
    }

    if (sub === "convidar" || sub === "remover") {
      if (!my) return interaction.reply({ content: "Você não tem call ativa.", ephemeral: true });

      const ch = await guild.channels.fetch(my.channelId).catch(() => null);
      if (!ch) {
        client.tempCalls.delete(ownerId);
        return interaction.reply({ content: "Sua call não existe mais.", ephemeral: true });
      }

      const users = [];
      for (let i = 1; i <= config.call.maxBatch; i++) {
        const u = interaction.options.getUser(`usuario${i}`);
        if (u) users.push(u);
      }

      for (const u of users) {
        if (u.bot) continue; // opcional: não convidar bots
        if (sub === "convidar") {
          await ch.permissionOverwrites.edit(u.id, {
            ViewChannel: true,
            Connect: true,
            Speak: true
          }).catch(() => {});
        } else {
          await ch.permissionOverwrites.delete(u.id).catch(() => {});
        }
      }

      const nomes = users.filter(u => !u.bot).map(u => `**${u.username}**`).join(", ") || "(ninguém)";
      return interaction.reply({
        content: sub === "convidar" ? `✅ Convidados: ${nomes}` : `🗑️ Removidos: ${nomes}`,
        ephemeral: true
      });
    }

    if (sub === "fechar") {
      if (!my) return interaction.reply({ content: "Você não tem call ativa.", ephemeral: true });

      const ch = await guild.channels.fetch(my.channelId).catch(() => null);
      if (ch) await ch.delete("Call temporária fechada pelo dono").catch(() => {});
      client.tempCalls.delete(ownerId);

      return interaction.reply({ content: "🗑️ Call temporária deletada.", ephemeral: true });
    }
  }
};