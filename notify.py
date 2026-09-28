#!/usr/bin/env python3
"""Send a "new paper on the porch" notice to every phone/browser that turned notices on.

Usage: notify.py "<title>" "<body>" "<url path, e.g. /editions/2026-09-28.html>"
       notify.py --init      (make the VAPID key pair once; the private key never leaves push/)
Uses Web Push (pywebpush). Subscriptions that the push service reports gone (404/410) are dropped.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PUSH = os.path.join(ROOT, "push")
KEYS = os.path.join(PUSH, "vapid.json")
PEM = os.path.join(PUSH, "vapid_private.pem")
SUBS = os.path.join(PUSH, "subs.json")


def init():
    import base64
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    if os.path.exists(PEM):
        print("keys already exist")
        return
    os.makedirs(PUSH, mode=0o700, exist_ok=True)
    key = ec.generate_private_key(ec.SECP256R1())
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    fd = os.open(PEM, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    os.write(fd, pem)
    os.close(fd)
    pub = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    json.dump({"public": base64.urlsafe_b64encode(pub).decode().rstrip("=")}, open(KEYS, "w"))
    print("made VAPID keys")


def send(title, body, url):
    from pywebpush import webpush, WebPushException
    try:
        subs = json.load(open(SUBS))
    except Exception:
        subs = []
    if not subs or not os.path.exists(PEM):
        print("notify: nobody subscribed yet")
        return
    tag = url.split("/")[1] if "/" in url[1:] else "paper"
    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})
    try:   # papers this phone un-starred on the kiosk (newsstand/private/muted.json, by push endpoint)
        muted = json.load(open(os.path.join(ROOT, "private", "muted.json")))
    except Exception:
        muted = {}
    keep, sent = [], 0
    for s in subs:
        if tag in muted.get(s["endpoint"], []):
            keep.append(s)
            continue
        try:
            webpush({"endpoint": s["endpoint"], "keys": s["keys"]}, payload, vapid_private_key=PEM,
                    vapid_claims={"sub": "mailto:double-wide@garden.invalid"}, ttl=12 * 3600, timeout=20)
            keep.append(s)
            sent += 1
        except WebPushException as ex:
            code = getattr(ex.response, "status_code", None)
            if code not in (404, 410):
                keep.append(s)
            print("notify: push failed (%s)" % code)
        except Exception as ex:
            keep.append(s)
            print("notify: push error %s" % type(ex).__name__)
    if len(keep) != len(subs):
        tmp = SUBS + ".tmp"
        json.dump(keep, open(tmp, "w"), indent=1)
        os.chmod(tmp, 0o600)
        os.replace(tmp, SUBS)
    print("notify: sent to %d device(s)" % sent)


if __name__ == "__main__":
    if sys.argv[1:] == ["--init"]:
        init()
    else:
        send(sys.argv[1], sys.argv[2], sys.argv[3])
