const { ChannelType } = require("discord.js");

// Nomes fixos (ordem padrão)
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

function makeCallStore() {
  // ownerId -> { guildId, channelId }
  const store = new Map();

  function isTempName(name) {
    return TEMP_CALL_NAMES.includes(name);
  }

  function isTempChannel(channel) {
    return (
      channel &&
      channel.type === ChannelType.GuildVoice &&
      isTempName(channel.name)
    );
  }

  function findByChannelId(channelId) {
    for (const [ownerId, info] of store.entries()) {
      if (info.channelId === channelId) return { ownerId, info };
    }
    return null;
  }

  function listTempChannelsInCategory(guild, categoryId) {
    return guild.channels.cache
      .filter(
        (ch) =>
          ch.type === ChannelType.GuildVoice &&
          ch.parentId === categoryId &&
          isTempName(ch.name)
      )
      .map((ch) => ch);
  }

  function pickNextAvailableName(existingChannels) {
    const used = new Set(existingChannels.map((ch) => ch.name));
    return TEMP_CALL_NAMES.find((name) => !used.has(name)) || null;
  }

  return {
    // Store
    set(ownerId, data) {
      store.set(ownerId, data);
    },
    get(ownerId) {
      return store.get(ownerId);
    },
    has(ownerId) {
      return store.has(ownerId);
    },
    delete(ownerId) {
      return store.delete(ownerId);
    },
    entries() {
      return store.entries();
    },

    // Helpers
    TEMP_CALL_NAMES,
    isTempName,
    isTempChannel,
    findByChannelId,
    listTempChannelsInCategory,
    pickNextAvailableName,
  };
}

module.exports = { makeCallStore, TEMP_CALL_NAMES };
