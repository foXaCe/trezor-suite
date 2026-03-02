from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

class CSPHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.trezor.io; connect-src data: *; frame-ancestors 'none'; upgrade-insecure-requests"
        )
        super().end_headers()

os.chdir("build")

server = HTTPServer(("localhost", 8000), CSPHandler)
print("Serving at http://localhost:8000")
server.serve_forever()
