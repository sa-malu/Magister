const { REST, Routes } = require("discord.js");

module.exports = async function registerCommands(client, config) {
  const rest = new REST({ version: "10" }).setToken(config.token);

  const commandsJson = [...client.commands.values()].map(cmd => cmd.data.toJSON());

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commandsJson }
  );

  console.log(`[COMMANDS] Registrados ${commandsJson.length} comandos.`);
};
