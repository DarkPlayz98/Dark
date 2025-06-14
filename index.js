const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("Bot is alive"));
app.listen(3000, () => console.log("Express server running"));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", msg => {
  if (msg.content === "!ping") msg.reply("Pong!");
});

client.on("guildMemberAdd", member => {
  const channel = member.guild.systemChannel;
  if (channel) channel.send(`🎉 Welcome <@${member.id}> to the server!`);
});

client.login(process.env.DISCORD_TOKEN);
