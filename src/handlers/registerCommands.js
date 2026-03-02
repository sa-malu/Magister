const { REST, Routes } = require("discord.js");

async function registerCommands(client, config) {
  const rest = new REST({ version: "10" }).setToken(config.token);

  // Pegue seus comandos carregados do jeito que você já faz.
  // A ideia aqui é: transformar tudo em JSON PURO antes de enviar.
  const commandsJson = client.commands.map((cmd) => cmd.data.toJSON());

  console.log(`[COMMANDS] Registrando ${commandsJson.length} comandos...`);

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commandsJson }
  );

  console.log("[COMMANDS] Registro concluído.");
}

module.exports = registerCommands;
