module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    // Se alguém saiu de uma call
    if (oldState.channelId && !newState.channelId) {
      const channel = oldState.channel;
      if (!channel) return;

      // Verifica se é call temporária
      for (const [ownerId, info] of client.tempCalls.entries()) {
        if (info.channelId === channel.id) {
          // Se ficou vazia
          const humans = channel.members.filter(m => !m.user.bot);
          if (humans.size === 0) {
            try {
              await channel.delete("Call temporária vazia");
            } catch {}
            client.tempCalls.delete(ownerId);
          }
          break;
        }
      }
    }
  }
};
