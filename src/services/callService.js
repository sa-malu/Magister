function makeCallStore() {
  // ownerId -> { guildId, channelId }
  const store = new Map();

  return {
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
    values() {
      return store.values();
    },
    findByChannelId(channelId) {
      for (const [ownerId, info] of store.entries()) {
        if (info.channelId === channelId) return { ownerId, info };
      }
      return null;
    },
  };
}

module.exports = { makeCallStore };
