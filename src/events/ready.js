module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Magister online como ${client.user.tag}`);
  }
};