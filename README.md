# The Newsstand

The one app you put on your phone: every paper laid out like rolling-paper packs on a table — each with its mascot in the oval and a red badge counting the issues you haven't read — plus an open slot for papers to come. Every paper rings the Newsstand's bell when a new issue lands (Web Push, one notice per paper, so the app icon shows how many papers have news).

Part of the Garden's papers, all read through **[The Newsstand](https://github.com/real-CAK3D/NewsStand)** — one home-screen app that mounts every paper under one private (Tailscale-only) HTTPS address: [The Double Wide](https://github.com/real-CAK3D/TheDoubleWide) (daily), [The Re-Up](https://github.com/real-CAK3D/TheRe-Up) (want ads), [The Sunday Smoke](https://github.com/real-CAK3D/TheSundaySmoke) (Sundays), [Roach Clips](https://github.com/real-CAK3D/RoachClips) (Tuesdays) and [The Green Thumb](https://github.com/real-CAK3D/TheGreenThumb) (the directory). The papers are written by [Hermes](https://github.com/NousResearch/hermes-agent) agents running on a small Oracle VM called The Garden.

## Files

| File | What it does |
|---|---|
| `build_newsstand.py` | Builds the rack from `papers.json` — add a paper there to give it a slot. |
| `papers.json` | The papers on the rack: name, mount path, schedule, style. |
| `serve.py`, `gardenweb.py` | Tiny static server + push-subscription endpoints. |
| `notify.py` | Sends a new-issue notice to every subscribed device (`notify.py --init` makes the VAPID keys once). |
| `site/sw.js, site/app.js, site/manifest.webmanifest` | The installable app shell: offline copies, notices, install button. |
| `make_icons.py` | Draws the home-screen icon. |
| `gardenweb.py` | The small shared web-server kit every Garden paper carries its own copy of. |

## Running

`tailscale serve --https=8444 http://<ip>:8090` for the rack, then `--set-path=/double-wide` (and so on) for each paper's server. Each project is Linux-first (`%-d` date formatting) and expects a Hermes install on the same machine.
