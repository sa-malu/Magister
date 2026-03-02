const giveaway = require("../services/giveawayService");
const rolePanel = require("../services/rolePanelService");
const { PermissionsBitField, MessageFlags } = require("discord.js");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client, config) {
    // Guild lock
    if (interaction.guildId && interaction.guildId !== config.guildId) {
      if (interaction.isRepliable()) {
        return interaction.reply({
          content: "Este bot funciona apenas no servidor configurado.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    // Botões do sorteio
    if (interaction.isButton()) {
      const id = interaction.customId;

      // customId: gw:join:<giveawayId>
      if (id.startsWith("gw:join:")) {
        const giveawayId = id.split(":")[2];
        const gw = await giveaway.getGiveaway(giveawayId);

        if (!gw || gw.ended) {
          return interaction.reply({
            content: "Esse sorteio já acabou (ou não existe).",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (interaction.user.bot) {
          return interaction.reply({
            content: "Bots não podem participar.",
            flags: MessageFlags.Ephemeral,
          });
        }

        giveaway.addEntry(giveawayId, interaction.user.id);
        const count = giveaway.countEntries(giveawayId);

        return interaction.reply({
          content: `✅ Você entrou no sorteio! (participantes: ${count})`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return;
    }

    // Select menu de cargos (role panels)
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("rolepanel:")) {
        if (interaction.user.bot) {
          return interaction.reply({ content: "Bots não podem usar isso.", flags: MessageFlags.Ephemeral });
        }

        // Bot precisa ManageRoles
        const me = interaction.guild?.members?.me;
        if (!me || !me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          return interaction.reply({
            content: "Eu não tenho permissão **Gerenciar Cargos**.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const panelId = interaction.customId.split(":")[1];
        const panel = rolePanel.getPanel(panelId);

        if (!panel) {
          return interaction.reply({
            content: "Painel não encontrado.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const member = interaction.member;
        const selected = interaction.values; // array de roleIds

        // Remove cargos desse painel que o membro já tenha
        const toRemove = panel.role_ids.filter((rid) => member.roles.cache.has(rid));
        if (toRemove.length) await member.roles.remove(toRemove).catch(() => {});

        // Adiciona os selecionados (exceto se for "none" — se você usar essa opção)
        const toAdd = selected.filter((v) => v !== "none");
        if (toAdd.length) await member.roles.add(toAdd).catch(() => {});

        return interaction.reply({
          content: "✅ Seus cargos foram atualizados.",
          flags: MessageFlags.Ephemeral,
        });
      }

      return;
    }

    // Slash commands
    if (!interaction.isChatInputCommand()) return;

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    try {
      await cmd.execute(interaction, client, config);
    } catch (err) {
      console.error(err);
      const msg = "Deu erro ao executar esse comando.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
    }
  },
};
