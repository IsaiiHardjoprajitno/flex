#!/usr/bin/env python3
"""
FieldOps Production Static & API Server Runner
Serves static assets with security headers, clean routing, and custom 404 handling.
"""

import os
import sys
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Ensure correct MIME types
mimetypes.init()
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('application/manifest+json', '.webmanifest')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/css', '.css')

PORT = int(os.environ.get('PORT', 8000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class FieldOpsHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        # Cache control
        if self.path.endswith(('.js', '.css', '.svg', '.png', '.jpg', '.woff2')):
            self.send_header('Cache-Control', 'public, max-age=86400')
        else:
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_GET(self):
        # Clean URL rewrites
        clean_path = self.path.split('?')[0].rstrip('/')
        
        rewrites = {
            '': '/index.html',
            '/privacy': '/privacy.html',
            '/terms': '/terms.html',
            '/client': '/client/index.html',
            '/client/privacy': '/client/privacy.html',
            '/client/terms': '/client/terms.html',
        }
        
        if clean_path in rewrites:
            self.path = rewrites[clean_path]
        
        # Check if file exists, if not serve 404.html
        requested_file = os.path.join(DIRECTORY, self.path.lstrip('/').replace('/', os.sep))
        if not os.path.exists(requested_file) and not os.path.isdir(requested_file):
            if not self.path.startswith('/api/'):
                self.path = '/404.html'
                self.send_response(404)

        return super().do_GET()


def run():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    server_address = ('', port)
    httpd = HTTPServer(server_address, FieldOpsHTTPHandler)
    print("===================================================")
    print(f"  FieldOps Production Web Server")
    print(f"  Listening on: http://localhost:{port}")
    print(f"  Root App:     http://localhost:{port}/")
    print(f"  React App:    http://localhost:{port}/client/")
    print(f"  Directory:    {DIRECTORY}")
    print("===================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping FieldOps Web Server...")
        httpd.server_close()


if __name__ == '__main__':
    run()
