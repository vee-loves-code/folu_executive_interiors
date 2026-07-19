#!/usr/bin/env python3
"""
Local-only combined dev server.

In production, Netlify serves /web as static files and Render runs
server/server.py as a separate API service — this file just glues both
together on one port so you can preview the whole site locally with a
single command. It is not deployed anywhere; Netlify and Render never
see it.

Run:  python3 dev_server.py [port]
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(ROOT, "web")
sys.path.insert(0, os.path.join(ROOT, "server"))

# Fixed, low-stakes login for local preview only — this file is never
# deployed, so there's no reason to deal with a random per-run password
# here. Real deployments (Render) must set FOLU_ADMIN_USER/PASS themselves;
# server.py enforces that separately.
os.environ.setdefault("FOLU_ADMIN_USER", "folu")
os.environ.setdefault("FOLU_ADMIN_PASS", "localdev123")

import server as api_server  # noqa: E402  (path must be set up first)


class DevHandler(api_server.Handler, SimpleHTTPRequestHandler):
    """Inherits from both so the API handler's helper methods (auth,
    JSON responses, etc.) are real bound methods on self, not just
    unbound calls that would be missing state."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def _is_api(self):
        path = self.path.split("?")[0]
        return path.startswith("/api/") or path == "/health"

    def do_GET(self):
        if self._is_api():
            return api_server.Handler.do_GET(self)
        # Netlify serves clean URLs (e.g. /admin -> admin.html) automatically
        # in production; replicate that here for local parity.
        path, _, query = self.path.partition("?")
        if path in ("/admin", "/admin/"):
            self.path = "/admin.html" + (("?" + query) if query else "")
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self._is_api():
            return api_server.Handler.do_POST(self)
        self.send_error(404)

    def do_PATCH(self):
        if self._is_api():
            return api_server.Handler.do_PATCH(self)
        self.send_error(404)

    def do_DELETE(self):
        if self._is_api():
            return api_server.Handler.do_DELETE(self)
        self.send_error(404)

    def do_OPTIONS(self):
        if self._is_api():
            return api_server.Handler.do_OPTIONS(self)
        self.send_error(204)


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    httpd = ThreadingHTTPServer(("0.0.0.0", port), DevHandler)
    print(f"Folu Executive Interior — local preview on http://localhost:{port}")
    print(f"Admin dashboard:  http://localhost:{port}/admin")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
