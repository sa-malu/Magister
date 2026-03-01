const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");

const colorPanel = require("../services/rolePanelService");

function addRoleBatch(sub, count) {
  for (let i = 1; i <= count; i++) {
    sub.addRoleOption((o) =>
      o.setName(`cargo${i}`).setDescription(`Cargo de cor ${i}`).setRequired(i === 1)
    );
  }
  return sub;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cores")
    .setDescription("Painel de cores para nick")
    .addSubcommand((sub) =>
      addRoleBatch(
        sub
          .setName("painel")
          .setDescription("Cria um painel de seleção de cores (até 10 cargos)")
          .addStringOption((o) =>
            o.setName("titulo").setDescription("Título do painel").setRequired(false)
          )
          .addStringOption((o) =>
            o.setName("descricao").setDescription("Descrição do painel").setRequired(false)
          ),
        10
      )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub !== "painel") return;

    // Só admin/gerente de cargos criar painel
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return interaction.reply({ content: "Você precisa de **Gerenciar Cargos**.", ephemeral: true });
    }

    // Bot precisa Gerenciar Cargos
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: "Eu não tenho permissão **Gerenciar Cargos**.",
        ephemeral: true,
      });
    }

    // Pega cargos do comando
    const roleIds = [];
    for (let i = 1; i <= 10; i++) {
      const r = interaction.options.getRole(`cargo${i}`);
      if (r) roleIds.push(r.id);
    }

    // Remove duplicados
    const uniqueRoleIds = [...new Set(roleIds)];

    // Validação: todos abaixo do bot
    const botTop = interaction.guild.members.me.roles.highest.position;
    const bad = uniqueRoleIds
      .map((id) => interaction.guild.roles.cache.get(id))
      .filter((r) => !r || r.position >= botTop);

    if (bad.length) {
      return interaction.reply({
        content:
          "Alguns cargos estão **acima ou no mesmo nível do bot**. Coloque o cargo do Magister acima deles.\n" +
          `Problema em: ${bad.map((r) => `**${r?.name ?? "?"}**`).join(", ")}`,
        ephemeral: true,
      });
    }

    const title = interaction.options.getString("titulo") || "🎨 Escolha sua cor";
    const desc =
      interaction.options.getString("descricao") ||
      "Selecione uma cor para o seu nick. Você só pode ter **uma** cor ativa.";

    // Primeiro manda uma mensagem “temporária” pra pegar messageId
    const embed = new EmbedBuilder().setTitle(title).setDescription(desc);

    const placeholderMenu = new StringSelectMenuBuilder()
      .setCustomId("color:select:pending")
      .setPlaceholder("Escolha uma cor…")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions([{ label: "Carregando…", value: "pending" }]);

    const msg = await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(placeholderMenu)],
      fetchReply: true,
    });

    // Cria panel no banco e atualiza customId definitivo
    const panelId = colorPanel.createPanel({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      messageId: msg.id,
      roleIds: uniqueRoleIds,
    });

    // Monta opções reais
    const options = [
      { label: "Sem cor", value: "none", description: "Remove sua cor atual" },
      ...uniqueRoleIds
        .map((id) => interaction.guild.roles.cache.get(id))
        .filter(Boolean)
        .map((r) => ({
          label: r.name,
          value: r.id,
          description: `Aplicar: ${r.name}`,
        })),
    ].slice(0, 25); // limite do select

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`color:select:${panelId}`)
      .setPlaceholder("Escolha uma cor…")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    await msg.edit({ components: [new ActionRowBuilder().addComponents(menu)] });

    // Confirma em ephemeral (sem poluir o canal)
    await interaction.followUp({
      content: `✅ Painel criado! (id: \`${panelId}\`)`,
      ephemeral: true,
    });
  },
};