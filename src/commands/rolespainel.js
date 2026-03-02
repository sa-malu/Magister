const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

const rolePanel = require("../services/rolePanelService");

const numberEmojis = [
  "0️⃣","1️⃣","2️⃣","3️⃣","4️⃣",
  "5️⃣","6️⃣","7️⃣","8️⃣","9️⃣",
  "🔟","🅰️","🅱️","🆎","🆑",
  "🆘","🆙","🆚","🆕","🆒"
];

function addRoleBatch(sub, count) {
  for (let i = 1; i <= count; i++) {
    sub.addRoleOption((o) =>
      o
        .setName(`cargo${i}`)
        .setDescription(`Cargo ${i}`)
        .setRequired(false) // ✅ TODOS OPCIONAIS (evita erro 50035)
    );
  }
  return sub;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolespainel")
    .setDescription("Painéis de seleção de cargos (até 10 no total)")
    .addSubcommand((sub) =>
      addRoleBatch(
        sub
          .setName("criar")
          .setDescription("Cria um painel de cargos")
          // required primeiro ✅
          .addStringOption((o) =>
            o.setName("titulo").setDescription("Título do painel").setRequired(true)
          )
          .addIntegerOption((o) =>
            o
              .setName("max_selecao")
              .setDescription("Máximo de cargos selecionáveis")
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(25)
          )
          // opcionais depois ✅
          .addStringOption((o) =>
            o.setName("descricao").setDescription("Descrição").setRequired(false)
          ),
        10
      )
    )
    .addSubcommand((sub) =>
      sub.setName("listar").setDescription("Lista os painéis existentes")
    )
    .addSubcommand((sub) =>
      sub
        .setName("deletar")
        .setDescription("Deleta um painel pelo ID (e remove o menu da mensagem)")
        .addStringOption((o) =>
          o.setName("id").setDescription("ID do painel").setRequired(true)
        )
    ),

  async execute(interaction) {
    // perms para administrar painéis
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return interaction.reply({
        content: "Você precisa de **Gerenciar Cargos**.",
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "listar") {
      const rows = rolePanel.listPanels(interaction.guildId);

      if (!rows.length) {
        return interaction.reply({ content: "Não há painéis cadastrados.", flags: MessageFlags.Ephemeral});
      }

      const lines = rows.slice(0, 10).map((p, i) => {
        return `${i + 1}. **${p.title || "Sem título"}** — id: \`${p.id}\` — max: **${p.max_select}** — msg: \`${p.message_id}\``;
      });

      return interaction.reply({
        content: `📋 **Painéis (${rows.length}/10):**\n${lines.join("\n")}`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === "deletar") {
      const id = interaction.options.getString("id");
      const panel = rolePanel.getPanel(id);
      if (!panel) return interaction.reply({ content: "Painel não encontrado.", flags: MessageFlags.Ephemeral });

      // tenta remover menu da mensagem
      try {
        const channel = await interaction.guild.channels.fetch(panel.channel_id).catch(() => null);
        if (channel) {
          const msg = await channel.messages.fetch(panel.message_id).catch(() => null);
          if (msg) await msg.edit({ components: [] }).catch(() => {});
        }
      } catch {}

      rolePanel.deletePanel(id);

      return interaction.reply({ content: `🗑️ Painel \`${id}\` deletado.`, flags: MessageFlags.Ephemeral });
    }

    // criar
    // limite 10 painéis
    const count = rolePanel.countPanels(interaction.guildId);
    if (count >= 10) {
      return interaction.reply({
        content: "Limite atingido: **máximo de 10 painéis**. Use `/rolespainel listar` e `/rolespainel deletar`.",
        flags: MessageFlags.Ephemeral
      });
    }

    // bot precisa manage roles
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: "Eu não tenho **Gerenciar Cargos**.", flags: MessageFlags.Ephemeral });
    }

    const title = interaction.options.getString("titulo");
    const description = interaction.options.getString("descricao") || "Selecione seus cargos abaixo:";
    const maxSelect = interaction.options.getInteger("max_selecao");

    const roleIds = [];
    for (let i = 1; i <= 10; i++) {
      const r = interaction.options.getRole(`cargo${i}`);
      if (r) roleIds.push(r.id);
    }
    const uniqueRoleIds = [...new Set(roleIds)].slice(0, 25);

    // ✅ valida: precisa ter ao menos 1 cargo
    if (!uniqueRoleIds.length) {
      return interaction.reply({
        content: "Você precisa informar pelo menos **1 cargo** (ex: `cargo1`).",
        flags: MessageFlags.Ephemeral,
      });
    }

    // valida hierarquia
    const botTop = interaction.guild.members.me.roles.highest.position;
    const invalid = uniqueRoleIds
      .map((id) => interaction.guild.roles.cache.get(id))
      .filter((r) => !r || r.position >= botTop);

    if (invalid.length) {
      return interaction.reply({
        content:
          "Alguns cargos estão acima (ou no mesmo nível) do bot. Coloque o cargo do Magister acima desses cargos.\n" +
          `Problema em: ${invalid.map((r) => `**${r?.name ?? "?"}**`).join(", ")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder().setTitle(title).setDescription(description);

    const options = uniqueRoleIds.map((id, index) => {
      const role = interaction.guild.roles.cache.get(id);
      return {
        label: role.name,
        value: id,
        emoji: numberEmojis[index] || undefined,
      };
    });

    const placeholder = maxSelect === 1
      ? "Selecione 1 cargo..."
      : `Selecione até ${maxSelect} cargos...`;

    const tempMsg = await interaction.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("rolepanel:pending")
            .setPlaceholder("Carregando...")
            .addOptions([{ label: "Carregando...", value: "pending" }])
        ),
      ],
      fetchReply: true,
    });

    const panelId = rolePanel.createPanel({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      messageId: tempMsg.id,
      roleIds: uniqueRoleIds,
      maxSelect,
      title,
      description,
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`rolepanel:${panelId}`)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(maxSelect)
      .addOptions(options);

    await tempMsg.edit({ components: [new ActionRowBuilder().addComponents(menu)] });

    await interaction.followUp({ content: `✅ Painel criado! ID: \`${panelId}\``, flags: MessageFlags.Ephemeral });
  },
};
