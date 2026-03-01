module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    // Se não existia canal antes, não tem o que checar
    if (!oldState.channelId) return;

    // Se a pessoa continuou no mesmo canal, ignora
    if (oldState.channelId === newState.channelId) return;

    const oldChannel = oldState.channel;
    if (!oldChannel) return;

    // Checa se esse canal é uma call temporária que o bot criou
    const found = client.tempCalls.findByChannelId(oldChannel.id);
    if (!found) return;

    // Se ficou vazio (sem humanos), delete
    const humans = oldChannel.members.filter((m) => !m.user.bot);
    if (humans.size > 0) return;

    try {
      await oldChannel.delete("Call temporária vazia (baseado em uso)");
    } catch {}

    client.tempCalls.delete(found.ownerId);
  },
};
