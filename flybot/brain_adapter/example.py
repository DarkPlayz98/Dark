"""Example adapter: send decoded fly motor activity to FlyBot.

Replace the `signals` values with the outputs of the real connectome simulator.
This file deliberately does not fake a biological simulation.
"""

import json
import os
import urllib.request

BRIDGE_URL = os.environ["FLYBOT_BRIDGE_URL"].rstrip("/") + "/brain/input"
SECRET = os.environ["BRAIN_WEBHOOK_SECRET"]

signals = {
    "forward": 0.0,
    "left": 0.0,
    "right": 0.0,
    "backward": 0.0,
    "escape": 0.0,
    "groom": 0.0,
    "explore": 0.0,
}

# Example placeholder. Replace this with real motor-neuron activity from your simulator.
signals["explore"] = 1.0

payload = json.dumps({
    "source": "connectome-adapter",
    "signals": signals,
}).encode("utf-8")

request = urllib.request.Request(
    BRIDGE_URL,
    data=payload,
    method="POST",
    headers={
        "Authorization": f"Bearer {SECRET}",
        "Content-Type": "application/json",
    },
)

with urllib.request.urlopen(request, timeout=10) as response:
    print(response.read().decode("utf-8"))
