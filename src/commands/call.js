const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
  PermissionFlagsBits,
} = require("discord.js");

// Nomes fixos (ordem fixa, reutiliza o primeiro livre)
const TEMP_CALL_NAMES = [
  "Instância",
  "Interseção",
  "Confluência",
  "Ressonância",
  "Fenda",
  "Paralelo",
  "Convergente",
  "Eclipse",
  "Nexo",
  "Interlúdio",
];

// Parse de string com menções/IDs: " @user1 @user2 123 456 "
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

function isTempName(name) {
  return TEMP_CALL_NAMES.includes(name);
}

function pickNextAvailableName(guild, categoryId) {
  const used = new Set(
    guild.channels.cache
      .filter(
        (ch) =>
          ch.type === ChannelType.GuildVoice &&
          ch.parentId === categoryId &&
          isTempName(ch.name)
      )
      .map((ch) => ch.name)
  );

  return TEMP_CALL_NAMES.find((n) => !used.has(n)) || null;
}

async function fetchExistingTempChannel(interaction, client, config) {
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

async function setConnectPermission(channel, target, allow) {
  // allow=true -> Connect true
  // allow=false -> Connect false
  const overwrite = {
    Connect: allow,
  };
  await channel.permissionOverwrites.edit(target, overwrite).catch(() => {});
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
    )
    // deixa claro que precisa de permissão para criar canal/gerenciar canal
    .setDefaultMemberPermissions(PermissionFlagsBits.Connect),

  async execute(interaction, client, config) {
    if (!interaction.guild) {
      return interaction.reply({ content: "Use isso dentro de um servidor.", ephemeral: true });
    }
    if (interaction.guildId !== config.guildId) {
      return interaction.reply({ content: "Este bot funciona apenas no servidor configurado.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const categoryId = config.tempVoiceCategoryId;

    if (!categoryId) {
      return interaction.reply({
        content: "TEMP_VOICE_CATEGORY_ID não está configurado.",
        ephemeral: true,
      });
    }

    // checa permissões do bot
    const me = interaction.guild.members.me;
    if (!me) {
      return interaction.reply({ content: "Não consegui obter minhas permissões.", ephemeral: true });
    }
    const need = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ManageChannels,
    ];
    for (const flag of need) {
      if (!me.permissions.has(flag)) {
        return interaction.reply({
          content: "Eu preciso de **Ver Canais** e **Gerenciar Canais** para isso.",
          ephemeral: true,
        });
      }
    }

    if (sub === "criar") {
      const existing = await fetchExistingTempChannel(interaction, client, config);
      if (existing) {
        return interaction.reply({
          content: `Você já tem uma call ativa: **${existing.name}**.`,
          ephemeral: true,
        });
      }

      const name = pickNextAvailableName(interaction.guild, categoryId);
      if (!name) {
        return interaction.reply({
          content: "Todas as instâncias estão ocupadas no momento (limite de 10).",
          ephemeral: true,
        });
      }

      const usersRaw = interaction.options.getString("usuarios") || "";
      const allowRole = interaction.options.getRole("cargo");

      const userIds = parseUserIds(usersRaw).filter((id) => id !== interaction.user.id);

      // Permission overwrites:
      // - everyone: pode ver, NÃO pode conectar
      // - owner: pode conectar
      // - convidados: podem conectar
      // - cargo (opcional): pode conectar
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

      for (const uid of userIds.slice(0, 25)) {
        overwrites.push({
          id: uid,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
        });
      }

      if (allowRole) {
        overwrites.push({
          id: allowRole.id,
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

      // guarda apenas pra “um dono -> um canal”
      client.tempCalls.set(interaction.user.id, { guildId: interaction.guildId, channelId: ch.id });

      const invitedCount = Math.min(userIds.length, 25);
      const roleTxt = allowRole ? ` + cargo **${allowRole.name}**` : "";
      const invitedTxt = invitedCount ? ` (usuários permitidos: ${invitedCount}${roleTxt})` : (roleTxt ? ` (${roleTxt.trim()})` : "");

      return interaction.reply({
        content: `◈ **${name}** foi aberta${invitedTxt}.`,
        ephemeral: true,
      });
    }

    // daqui pra baixo: precisa ter call existente
    const channel = await fetchExistingTempChannel(interaction, client, config);
    if (!channel) {
      return interaction.reply({
        content: "Você não tem uma call temporária ativa. Use `/call criar`.",
        ephemeral: true,
      });
    }

    // segurança: só mexe se for voice e estiver na categoria correta e for “nome de instância”
    if (channel.type !== ChannelType.GuildVoice || channel.parentId !== categoryId || !isTempName(channel.name)) {
      return interaction.reply({
        content: "Sua call registrada não parece ser uma instância válida. (Talvez foi movida/renomeada?)",
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

    // convidar / remover
    const usersRaw = interaction.options.getString("usuarios") || "";
    const role = interaction.options.getRole("cargo");
    const userIds = parseUserIds(usersRaw).filter((id) => id !== interaction.user.id);

    if (!userIds.length && !role) {
      return interaction.reply({
        content: "Informe `usuarios` (menções/IDs) e/ou `cargo`.",
        ephemeral: true,
      });
    }

    if (sub === "convidar") {
      // role
      if (role) {
        await setConnectPermission(channel, role, true);
      }

      // users
      let ok = 0;
      for (const uid of userIds.slice(0, 25)) {
        const member = await interaction.guild.members.fetch(uid).catch(() => null);
        if (!member || member.user.bot) continue;
        await setConnectPermission(channel, member, true);
        ok++;
      }

      const roleTxt = role ? `cargo **${role.name}**` : null;
      const userTxt = ok ? `${ok} usuário(s)` : null;
      const parts = [userTxt, roleTxt].filter(Boolean).join(" e ");

      return interaction.reply({
        content: `✅ Permissão de conectar atualizada: ${parts || "ok"}.`,
        ephemeral: true,
      });
    }

    if (sub === "remover") {
      if (role) {
        await setConnectPermission(channel, role, false);
      }

      let ok = 0;
      for (const uid of userIds.slice(0, 25)) {
        const member = await interaction.guild.members.fetch(uid).catch(() => null);
        if (!member || member.user.bot) continue;

        // ao remover, a pessoa ainda vai VER, mas não conecta
        await setConnectPermission(channel, member, false);

        // se estiver dentro, expulsa (opcional e útil)
        if (member.voice?.channelId === channel.id) {
          await member.voice.setChannel(null).catch(() => {});
        }

        ok++;
      }

      const roleTxt = role ? `cargo **${role.name}**` : null;
      const userTxt = ok ? `${ok} usuário(s)` : null;
      const parts = [userTxt, roleTxt].filter(Boolean).join(" e ");

      return interaction.reply({
        content: `🧽 Permissão removida: ${parts || "ok"}.`,
        ephemeral: true,
      });
    }
  },
};
