#!/usr/bin/env python3
"""
Folu Executive Interior — consultations API.

A tiny JSON API (stdlib only) that the public site POSTs consultation
requests to, and the admin dashboard reads/updates from. Deployed
separately from the static site (which lives in /web and is published
by Netlify) — this runs on a host that can keep a process alive and
write to disk, e.g. Render.

Run:  python3 server.py [port]

Required environment variables (set these in your host's dashboard —
never commit real credentials to git):
  FOLU_ADMIN_USER
  FOLU_ADMIN_PASS
If unset, a random password is generated for this run only and printed
to the console, so local testing still works without extra setup.
"""

import json
import os
import sys
import uuid
import base64
import secrets
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DATA_FILE = os.path.join(DATA_DIR, "consultations.json")

# Where the public site is hosted — used only to set a permissive CORS
# header so the Netlify-hosted frontend can call this API directly if
# it isn't proxied through a same-origin redirect.
ALLOWED_ORIGIN = os.environ.get("FOLU_ALLOWED_ORIGIN", "*")

ADMIN_USER = os.environ.get("FOLU_ADMIN_USER")
ADMIN_PASS = os.environ.get("FOLU_ADMIN_PASS")
if not ADMIN_USER or not ADMIN_PASS:
    ADMIN_USER = ADMIN_USER or "folu"
    ADMIN_PASS = secrets.token_urlsafe(9)
    print("[folu-admin] FOLU_ADMIN_USER / FOLU_ADMIN_PASS not set — using a temporary login for this run only:")
    print(f"[folu-admin]   user: {ADMIN_USER}")
    print(f"[folu-admin]   pass: {ADMIN_PASS}")
    print("[folu-admin] Set both env vars for a stable login (required before deploying for real).")


def load_consultations():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_consultations(records):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


class Handler(BaseHTTPRequestHandler):
    # ---- auth helpers ----
    def _is_authorized(self):
        auth = self.headers.get("Authorization")
        if not auth or not auth.startswith("Basic "):
            return False
        try:
            decoded = base64.b64decode(auth[6:]).decode("utf-8")
            user, _, pw = decoded.partition(":")
        except Exception:
            return False
        return user == ADMIN_USER and pw == ADMIN_PASS

    def _require_auth(self):
        body = b'{"error": "Authorization required"}'
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="Folu Executive Interior Admin"')
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    # ---- shared response helpers ----
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def log_message(self, fmt, *args):
        super().log_message(fmt, *args)

    # ---- routing ----
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/consultations":
            if not self._is_authorized():
                return self._require_auth()
            records = sorted(load_consultations(), key=lambda r: r.get("createdAt", ""), reverse=True)
            return self._send_json(records)

        if path == "/" or path == "/health":
            return self._send_json({"ok": True, "service": "folu-executive-interior-api"})

        self._send_json({"error": "Not found"}, status=404)

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/consultations":
            data = self._read_json_body()
            name = (data.get("name") or "").strip()
            if not name:
                return self._send_json({"error": "Name is required"}, status=400)

            record = {
                "id": str(uuid.uuid4()),
                "name": name,
                "phone": (data.get("phone") or "").strip(),
                "email": (data.get("email") or "").strip(),
                "message": (data.get("message") or "").strip(),
                "status": "New",
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            records = load_consultations()
            records.append(record)
            save_consultations(records)
            return self._send_json(record, status=201)

        self._send_json({"error": "Not found"}, status=404)

    def do_PATCH(self):
        path = urlparse(self.path).path

        if path.startswith("/api/consultations/"):
            if not self._is_authorized():
                return self._require_auth()
            record_id = path.rsplit("/", 1)[-1]
            data = self._read_json_body()
            records = load_consultations()
            for r in records:
                if r["id"] == record_id:
                    if "status" in data:
                        r["status"] = data["status"]
                    save_consultations(records)
                    return self._send_json(r)
            return self._send_json({"error": "Not found"}, status=404)

        self._send_json({"error": "Not found"}, status=404)

    def do_DELETE(self):
        path = urlparse(self.path).path

        if path.startswith("/api/consultations/"):
            if not self._is_authorized():
                return self._require_auth()
            record_id = path.rsplit("/", 1)[-1]
            records = load_consultations()
            filtered = [r for r in records if r["id"] != record_id]
            if len(filtered) == len(records):
                return self._send_json({"error": "Not found"}, status=404)
            save_consultations(filtered)
            return self._send_json({"ok": True})

        self._send_json({"error": "Not found"}, status=404)


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    port = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 5173))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Folu Executive Interior API running on http://localhost:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
