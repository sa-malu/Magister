// src/handlers/registerCommands.js
const { REST, Routes } = require("discord.js");

async function registerCommands(arg1, arg2, arg3, arg4) {
  // Aceita:
  // registerCommands({ token, clientId, guildId, commands })
  // ou registerCommands(token, clientId, guildId, commands)
  const opts =
    typeof arg1 === "object" && arg1 !== null
      ? arg1
      : { token: arg1, clientId: arg2, guildId: arg3, commands: arg4 };

  const { token, clientId, guildId, commands } = opts || {};

  if (!token) throw new Error("registerCommands: token ausente (config.token).");
  if (!clientId) throw new Error("registerCommands: clientId ausente.");
  if (!guildId) throw new Error("registerCommands: guildId ausente (config.guildId).");
  if (!Array.isArray(commands)) throw new Error("registerCommands: commands não é array.");

  const rest = new REST({ version: "10" }).setToken(token);

  // Enviar JSON puro (evita payload embaralhado)
  const body = commands.map((c) => c.data.toJSON());

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });

  console.log(`[COMMANDS] Registrados ${body.length} comandos na guild ${guildId}.`);
}

module.exports = { registerCommands };
