const fs = require("fs");
const path = require("path");

function loadCommands() {
  const dir = path.join(__dirname, "..", "commands");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));

  const commands = [];
  for (const file of files) {
    const cmd = require(path.join(dir, file));
    commands.push(cmd);
  }
  return commands;
}

module.exports = { loadCommands };