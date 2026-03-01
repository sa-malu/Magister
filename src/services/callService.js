// Memória runtime: 1 call por dono
// ownerId -> { channelId, expiresAt, deleteIfEmpty }
function makeCallStore() {
  return new Map();
}

module.exports = { makeCallStore };