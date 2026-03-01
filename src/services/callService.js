function makeCallStore() {
  const store = new Map();

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
    "Interlúdio"
  ];

  function isTempChannel(ch) {
    return TEMP_CALL_NAMES.includes(ch?.name);
  }

  function findByChannelId(channelId) {
    for (const [ownerId, info] of store.entries()) {
      if (info.channelId === channelId) return { ownerId, info };
    }
    return null;
  }

  function listTempChannelsInCategory(guild, categoryId) {
    return guild.channels.cache
      .filter(ch =>
        ch.parentId === categoryId &&
        ch.type === 2 && // GuildVoice
        isTempChannel(ch)
      )
      .map(ch => ch);
  }

  function pickNextAvailableName(existingChannels) {
    const used = new Set(existingChannels.map(ch => ch.name));
    return TEMP_CALL_NAMES.find(name => !used.has(name)) || null;
  }

  return {
    set(ownerId, data) { store.set(ownerId, data); },
    get(ownerId) { return store.get(ownerId); },
    has(ownerId) { return store.has(ownerId); },
    delete(ownerId) { return store.delete(ownerId); },
    entries() { return store.entries(); },

    isTempChannel,
    findByChannelId,
    listTempChannelsInCategory,
    pickNextAvailableName,
  };
}

module.exports = { makeCallStore };
