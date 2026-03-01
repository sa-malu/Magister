const { REST, Routes } = require("discord.js");

async function registerCommands({ token, clientId, guildId, commands }) {
  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands.map(c => c.data.toJSON()) }
  );
}

module.exports = { registerCommands };