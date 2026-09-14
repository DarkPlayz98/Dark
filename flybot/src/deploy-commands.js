import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID are required');
}

const command = new SlashCommandBuilder()
  .setName('fly')
  .setDescription('Inspect the FlyBot brain bridge')
  .addSubcommand(sub => sub
    .setName('status')
    .setDescription('Show bridge status'))
  .addSubcommand(sub => sub
    .setName('test')
    .setDescription('Send a test motor signal through the bridge'));

const rest = new REST({ version: '10' }).setToken(token);
const body = [command.toJSON()];

if (guildId) {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
  console.log(`Registered FlyBot commands in guild ${guildId}`);
} else {
  await rest.put(Routes.applicationCommands(clientId), { body });
  console.log('Registered FlyBot commands globally');
}
