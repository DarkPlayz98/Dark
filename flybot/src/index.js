import http from 'node:http';
import { Client, GatewayIntentBits } from 'discord.js';

const env = (key, fallback = '') => process.env[key] ?? fallback;

const DISCORD_TOKEN = env('DISCORD_TOKEN');
const TARGET_CHANNEL_ID = env('TARGET_CHANNEL_ID');
const BRAIN_WEBHOOK_SECRET = env('BRAIN_WEBHOOK_SECRET');
const PORT = Number(env('PORT', '8080'));

if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required');
if (!TARGET_CHANNEL_ID) throw new Error('TARGET_CHANNEL_ID is required');
if (!BRAIN_WEBHOOK_SECRET) throw new Error('BRAIN_WEBHOOK_SECRET is required');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be 1-65535');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let lastSignal = null;
let lastMessage = null;
let messagesSent = 0;
let lastActionAt = 0;

const ACTIONS = {
  forward: '🪰 I am moving forward.',
  left: '🪰 I turned left.',
  right: '🪰 I turned right.',
  backward: '🪰 I moved backward.',
  escape: '🪰 Escape response detected!',
  groom: '🪰 Grooming response detected.',
  explore: '🪰 I am exploring.',
};

function pickAction(signals = {}) {
  const candidates = Object.entries(signals)
    .map(([name, value]) => [name, Number(value)])
    .filter(([name, value]) => ACTIONS[name] && Number.isFinite(value));

  if (!candidates.length) return null;
  candidates.sort((a, b) => b[1] - a[1]);

  const [name, score] = candidates[0];
  return score > 0 ? { name, score } : null;
}

async function sendFlyMessage(payload) {
  const action = pickAction(payload?.signals);
  if (!action) return { sent: false, reason: 'No positive mapped motor signal.' };

  // Prevent a fast simulator from flooding a Discord channel.
  const now = Date.now();
  if (now - lastActionAt < 1000) {
    return { sent: false, reason: 'Rate limited; wait at least 1 second between messages.' };
  }

  const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
  if (!channel?.isTextBased()) throw new Error('TARGET_CHANNEL_ID is not a text channel');

  const content = `${ACTIONS[action.name]}\n\`signal=${action.name}\` \`activity=${action.score.toFixed(4)}\``;
  const message = await channel.send(content);

  lastSignal = payload;
  lastMessage = message.createdAt.toISOString();
  messagesSent += 1;
  lastActionAt = now;

  return { sent: true, action, messageId: message.id };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 256_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      ok: true,
      discordReady: client.isReady(),
      messagesSent,
      lastMessage,
      lastSignal,
    }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/brain/input') {
    if (req.headers.authorization !== `Bearer ${BRAIN_WEBHOOK_SECRET}`) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const payload = await readJson(req);
      const result = await sendFlyMessage(payload);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('[brain/input]', error);
      res.writeHead(400);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'fly') return;

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'status') {
    await interaction.reply({
      ephemeral: true,
      content: [
        '🪰 FlyBot status',
        `Discord: ${client.isReady() ? 'online' : 'offline'}`,
        `Brain gateway: ${server.listening ? 'listening' : 'offline'}`,
        `Messages sent: ${messagesSent}`,
        `Last action: ${lastSignal ? JSON.stringify(lastSignal.signals ?? {}) : 'none'}`,
      ].join('\n'),
    });
    return;
  }

  if (subcommand === 'test') {
    try {
      const result = await sendFlyMessage({
        source: 'manual-test',
        signals: { explore: 1 },
      });

      await interaction.reply({
        ephemeral: true,
        content: result.sent ? `✅ Test signal sent as ${result.action.name}.` : `⚠️ ${result.reason}`,
      });
    } catch (error) {
      await interaction.reply({ ephemeral: true, content: `❌ ${error.message}` });
    }
  }
});

client.once('ready', () => {
  console.log(`FlyBot online as ${client.user.tag}`);
  console.log(`Brain gateway listening on :${PORT}`);
});

server.listen(PORT, '0.0.0.0');
client.login(DISCORD_TOKEN);
