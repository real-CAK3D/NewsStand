#!/usr/bin/env python3
"""The Newsstand web server — the Garden's one home-screen app (Tailscale-only; `tailscale serve --https=8444` mounts it at /
and each paper at its own path). Static rack + app shell (manifest, service worker) + new-issue notices (/api/push/*).
Usage: serve.py <site_dir> <host> <port>"""
import os, sys
import gardenweb as gw


class Handler(gw.Handler):
    ROOT = os.path.dirname(os.path.abspath(__file__))


if __name__ == "__main__":
    gw.run(Handler, sys.argv[1], sys.argv[2], int(sys.argv[3]))
