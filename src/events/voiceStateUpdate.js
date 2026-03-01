module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client, config) {
    // só interessa quando alguém saiu/trocou
    if (!oldState.channelId || oldState.channelId === newState.channelId) return;

    const leftChannel = oldState.channel;
    if (!leftChannel) return;

    // Se era call temporária registrada e ficou vazia, deleta
    for (const [ownerId, info] of client.tempCalls.entries()) {
      if (info.channelId === leftChannel.id && info.deleteIfEmpty) {
        if (leftChannel.members.size === 0) {
          try { await leftChannel.delete("Call temporária vazia"); } catch {}
          client.tempCalls.delete(ownerId);
        }
        break;
      }
    }
  }
};