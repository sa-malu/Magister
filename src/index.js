const { Client, Collection, GatewayIntentBits, ChannelType } = require("discord.js");

const config = require("./config");
const { loadCommands } = require("./handlers/loadCommands");
const { registerCommands } = require("./handlers/registerCommands");
const { makeCallStore } = require("./services/callService");

const { migrate } = require("./db/migrate");
const giveaway = require("./services/giveawayService");
const xp = require("./services/xpService");

// Events
const readyEvent = require("./events/ready");
const interactionEvent = require("./events/interactionCreate");
const messageEvent = require("./events/messageCreate");
const voiceEvent = require("./events/voiceStateUpdate");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();
client.tempCalls = makeCallStore();

async function bootstrap() {
  // 1) Banco primeiro (antes de qualquer coisa)
  await migrate();

  // 2) Carrega comandos
  const commands = loadCommands();
  for (const cmd of commands) client.commands.set(cmd.data.name, cmd);

  // 3) Ready + registrar slash commands
  client.once("ready", async () => {
    await readyEvent.execute(client);

    await registerCommands({
      token: config.token,
      clientId: client.user.id,
      guildId: config.guildId,
      commands,
    });

    console.log("✅ Slash commands registrados na guild!");
  });

  // 4) Eventos
  client.on("interactionCreate", (i) => interactionEvent.execute(i, client, config));
  client.on("messageCreate", (m) => messageEvent.execute(m, client, config));
  client.on("voiceStateUpdate", (o, n) => voiceEvent.execute(o, n, client, config));

  // 5) XP Tick por VOZ (1x por minuto)
  setInterval(async () => {
    try {
      const guild = client.guilds.cache.get(config.guildId);
      if (!guild) return;

      for (const [, ch] of guild.channels.cache) {
        if (ch.type !== ChannelType.GuildVoice) continue;

        const humans = ch.members.filter((m) => !m.user.bot);
        if (humans.size < 2) continue; // regra: precisa 2 humanos

        for (const [, member] of humans) {
          // opcional: bloquear deaf pra evitar AFK farm
          if (member.voice?.selfDeaf) continue;

          await xp.addVoiceSeconds(member.id, 60);
          await xp.addXp(member.id, config.xp.voicePerMin);
        }
      }
    } catch (e) {
      console.error("Erro no tick de XP por voz:", e);
    }
  }, 60_000);

  // 7) Finaliza sorteios automaticamente
  setInterval(async () => {
    try {
      const now = Date.now();
      const due = await giveaway.getDueGiveaways(now);
      if (!due.length) return;

      for (const gw of due) {
        try {
          const guild = client.guilds.cache.get(gw.guild_id);
          if (!guild) {
            await giveaway.markEnded(gw.id);
            continue;
          }

          const channel = await guild.channels.fetch(gw.channel_id).catch(() => null);
          if (!channel) {
            await giveaway.markEnded(gw.id);
            continue;
          }

          const entries = await giveaway.listEntries(gw.id);
          const winnersIds = giveaway.pickWinners(entries, gw.winners);

          await giveaway.markEnded(gw.id);

          if (!winnersIds.length) {
            await channel.send(`🎁 **Sorteio encerrado:** ${gw.prize}\nNinguém participou 😿`);
          } else {
            const mentions = winnersIds.map((id) => `<@${id}>`).join(", ");
            await channel.send(`🎉 **Sorteio encerrado:** ${gw.prize}\n🏆 Vencedor(es): ${mentions}`);
          }
        } catch (e) {
          console.error("Erro ao finalizar sorteio:", e);
          // evita loop infinito de finalizar sempre o mesmo sorteio
          await giveaway.markEnded(gw.id).catch(() => {});
        }
      }
    } catch (e) {
      console.error("Erro no tick de sorteios:", e);
    }
  }, 5_000);

  // 8) Login por último
  await client.login(config.token);
}

bootstrap().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
