const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

function parseUserIds(raw) {
  if (!raw) return [];
  const ids = new Set();

  // <@123> ou <@!123>
  const mentionRe = /<@!?(\d{17,20})>/g;
  let m;
  while ((m = mentionRe.exec(raw)) !== null) ids.add(m[1]);

  // IDs soltos
  const idRe = /\b(\d{17,20})\b/g;
  while ((m = idRe.exec(raw)) !== null) ids.add(m[1]);

  return [...ids];
}

async function fetchExistingTempChannel(interaction, client) {
  const info = client.tempCalls.get(interaction.user.id);
  if (!info) return null;

  const guild = interaction.guild;
  if (!guild) return null;

  const ch = await guild.channels.fetch(info.channelId).catch(() => null);
  if (!ch) {
    client.tempCalls.delete(interaction.user.id);
    return null;
  }
  return ch;
}

async function setConnectPermission(channel, targetIdOrObj, allow) {
  // allow=true -> Connect true
  // allow=false -> Connect false
  await channel.permissionOverwrites
    .edit(targetIdOrObj, { Connect: allow })
    .catch(() => {});
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("call")
    .setDescription("Sistema de calls temporárias (baseado em uso)")
    .addSubcommand((sub) =>
      sub
        .setName("criar")
        .setDescription("Cria uma call temporária (vive enquanto estiver em uso)")
        .addStringOption((o) =>
          o
            .setName("usuarios")
            .setDescription("Quem pode conectar (menções ou IDs, separados por espaço)")
            .setRequired(false)
        )
        .addRoleOption((o) =>
          o
            .setName("cargo")
            .setDescription("Cargo que pode conectar (opcional)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("convidar")
        .setDescription("Permite que usuários (ou um cargo) conectem na sua call")
        .addStringOption((o) =>
          o
            .setName("usuarios")
            .setDescription("Menções ou IDs, separados por espaço")
            .setRequired(false)
        )
        .addRoleOption((o) =>
          o
            .setName("cargo")
            .setDescription("Cargo a permitir conectar (opcional)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remover")
        .setDescription("Remove permissão de conectar de usuários (ou cargo) na sua call")
        .addStringOption((o) =>
          o
            .setName("usuarios")
            .setDescription("Menções ou IDs, separados por espaço")
            .setRequired(false)
        )
        .addRoleOption((o) =>
          o
            .setName("cargo")
            .setDescription("Cargo a remover permissão (opcional)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("fechar")
        .setDescription("Fecha (deleta) sua call temporária imediatamente")
    ),

  async execute(interaction, client, config) {
    if (!interaction.guild) {
      return interaction.reply({ content: "Use isso dentro de um servidor.", flags: MessageFlags.Ephemeral });
    }

    // Guild lock (se você usa isso)
    if (interaction.guildId !== config.guildId) {
      return interaction.reply({ content: "Este bot funciona apenas no servidor configurado.", flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();
    const categoryId = config.tempVoiceCategoryId;

    if (!categoryId) {
      return interaction.reply({
        content: "TEMP_VOICE_CATEGORY_ID não está configurado.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Permissões do BOT
    const me = interaction.guild.members.me;
    if (!me) {
      return interaction.reply({ content: "Não consegui obter minhas permissões.", flags: MessageFlags.Ephemeral });
    }

    if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({
        content: "Eu preciso de **Gerenciar Canais** para criar/deletar call.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === "criar") {
      // 1 dono -> 1 call
      const existing = await fetchExistingTempChannel(interaction, client);
      if (existing) {
        return interaction.reply({
          content: `Você já tem uma call ativa: **${existing.name}**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // pega o menor nome disponível na categoria
      const existingTemps = client.tempCalls.listTempChannelsInCategory(interaction.guild, categoryId);
      const name = client.tempCalls.pickNextAvailableName(existingTemps);

      if (!name) {
        return interaction.reply({
          content: "Todas as instâncias estão ocupadas no momento (limite de 10).",
          flags: MessageFlags.Ephemeral,
        });
      }

      const usersRaw = interaction.options.getString("usuarios") || "";
      const role = interaction.options.getRole("cargo");
      const userIds = parseUserIds(usersRaw)
        .filter((id) => id !== interaction.user.id)
        .slice(0, 25);

      // everyone: vê, mas não conecta
      // owner: vê e conecta
      // convidados/role: vê e conecta
      const overwrites = [
        {
          id: interaction.guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
          deny: [PermissionsBitField.Flags.Connect],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
        },
      ];

      for (const uid of userIds) {
        overwrites.push({
          id: uid,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
        });
      }

      if (role) {
        overwrites.push({
          id: role.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
        });
      }

      const ch = await interaction.guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: categoryId,
        permissionOverwrites: overwrites,
        reason: "Call temporária criada (Magister)",
      });

      client.tempCalls.set(interaction.user.id, {
        guildId: interaction.guildId,
        channelId: ch.id,
      });

      const invitedCount = userIds.length;
      const roleTxt = role ? ` + cargo **${role.name}**` : "";
      const invitedTxt =
        invitedCount || role
          ? ` (permitidos: ${invitedCount}${roleTxt})`
          : "";

      return interaction.reply({
        content: `◈ **${name}** foi aberta${invitedTxt}.`,
        ephemeral: true,
      });
    }

    // A partir daqui: precisa ter call existente do dono
    const channel = await fetchExistingTempChannel(interaction, client);
    if (!channel) {
      return interaction.reply({
        content: "Você não tem uma call temporária ativa. Use `/call criar`.",
        ephemeral: true,
      });
    }

    // Segurança extra: garante que é uma temp válida (nome + categoria + tipo)
    if (
      channel.type !== ChannelType.GuildVoice ||
      channel.parentId !== categoryId ||
      !client.tempCalls.isTempChannel(channel)
    ) {
      return interaction.reply({
        content: "Sua call registrada não parece ser uma instância válida (foi movida/renomeada?).",
        ephemeral: true,
      });
    }

    if (sub === "fechar") {
      try {
        await channel.delete("Call temporária fechada pelo dono");
      } catch {}
      client.tempCalls.delete(interaction.user.id);

      return interaction.reply({ content: "🗝️ Instância encerrada.", ephemeral: true });
    }

    const usersRaw = interaction.options.getString("usuarios") || "";
    const role = interaction.options.getRole("cargo");
    const userIds = parseUserIds(usersRaw)
      .filter((id) => id !== interaction.user.id)
      .slice(0, 25);

    if (!userIds.length && !role) {
      return interaction.reply({
        content: "Informe `usuarios` (menções/IDs) e/ou `cargo`.",
        ephemeral: true,
      });
    }

    if (sub === "convidar") {
      if (role) await setConnectPermission(channel, role.id, true);

      let ok = 0;
      for (const uid of userIds) {
        const member = await interaction.guild.members.fetch(uid).catch(() => null);
        if (!member || member.user.bot) continue;
        await setConnectPermission(channel, member.id, true);
        ok++;
      }

      const parts = [];
      if (ok) parts.push(`${ok} usuário(s)`);
      if (role) parts.push(`cargo **${role.name}**`);

      return interaction.reply({
        content: `✅ Permissão de conectar atualizada: ${parts.join(" e ") || "ok"}.`,
        ephemeral: true,
      });
    }

    if (sub === "remover") {
      if (role) await setConnectPermission(channel, role.id, false);

      let ok = 0;
      for (const uid of userIds) {
        const member = await interaction.guild.members.fetch(uid).catch(() => null);
        if (!member || member.user.bot) continue;

        await setConnectPermission(channel, member.id, false);

        // Se estiver dentro, expulsa (útil)
        if (member.voice?.channelId === channel.id) {
          await member.voice.setChannel(null).catch(() => {});
        }

        ok++;
      }

      const parts = [];
      if (ok) parts.push(`${ok} usuário(s)`);
      if (role) parts.push(`cargo **${role.name}**`);

      return interaction.reply({
        content: `🧽 Permissão removida: ${parts.join(" e ") || "ok"}.`,
        ephemeral: true,
      });
    }
  },
};
