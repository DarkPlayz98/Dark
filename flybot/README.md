# 🪰 FlyBot

A Discord bridge for a simulated **Drosophila melanogaster** nervous system.

The project is designed around the same separation used by current fly-connectome experiments:

`real connectome / neural simulation → motor-output decoder → FlyBot HTTP gateway → Discord`

## What this repository does now

FlyBot is the **Discord + gateway layer**. It accepts named motor signals over a protected HTTP endpoint and translates the strongest positive signal into a Discord message.

Supported signals:

- `forward`
- `left`
- `right`
- `backward`
- `escape`
- `groom`
- `explore`

This is intentionally not pretending to be the fly brain itself. The real connectome simulator is the next integration layer.

## Real connectome targets

Useful public projects for the next stage include:

- **FlyBrain** — a browser simulation of the 139,255-neuron FlyWire FAFB v783 connectome using a leaky-integrate-and-fire model: https://github.com/snedea/flybrain
- **DOOMFLY** — a whole-connectome experiment using the 166,700-neuron MaleCNS graph and an explicit neuron-to-button interface: https://github.com/nftechie/doomfly
- **Fruit Fly Laboratory** — another FlyWire whole-brain simulation with a Python LIF engine and motor/sensory pipeline: https://github.com/vaibhavkedarisetti/fruit-fly-lab

The simulator data is large and may require significantly more compute than a small Discord bot host. FlyBrain reports real-time browser simulation, while other implementations use GPU-heavy sparse simulation. Choose the simulator/runtime separately from the bot gateway.

## HTTP protocol

### Health

`GET /health`

### Brain input

`POST /brain/input`

Header:

`Authorization: Bearer YOUR_BRAIN_WEBHOOK_SECRET`

JSON body example:

```json
{
  "source": "fly-connectome",
  "timestamp": "2026-09-14T00:00:00.000Z",
  "signals": {
    "forward": 0.12,
    "left": 0.04,
    "right": 0.71,
    "backward": 0.01,
    "escape": 0.00,
    "groom": 0.00,
    "explore": 0.20
  }
}
```

The highest positive mapped signal becomes the Discord action. A one-second server-side cooldown prevents a high-frequency simulator from flooding the channel.

## Discord setup

Create a Discord application and bot, then provide:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID` (recommended for development)
- `TARGET_CHANNEL_ID`
- `BRAIN_WEBHOOK_SECRET`
- `PORT` (usually supplied by the host)

Never commit `.env` or a real bot token.

## Install

```bash
npm install
npm run commands
npm start
```

## Commands

`/fly status` — show Discord/gateway status.

`/fly test` — send an `explore` test signal through the same path used by the brain.

## FreezeHost deployment

FreezeHost currently provides cloud hosting through its dashboard and Discord authentication. The project is intentionally shaped as a normal Node.js service: install dependencies with `npm install`, start with `npm start`, and provide secrets as environment variables rather than files.

Set the service start command to:

```bash
npm start
```

Set the working directory to `flybot` when deploying this repository as a subdirectory, or deploy the `flybot` folder as the project root if FreezeHost's Git workflow allows a subdirectory selection.

## Next milestone: real fly-brain adapter

1. Select one verified simulator and its exact output neuron/cell names.
2. Run the simulator separately from the Discord gateway if the host cannot handle the full connectome.
3. Convert simulator outputs into the small signal protocol above.
4. Send those signals to `/brain/input`.
5. Test behavior with controlled sensory inputs and compare it against the simulator's own motor outputs.

The key rule is: **the Discord bot interprets the simulator's output; it does not invent a fake brain and call it a connectome.**
