#!/usr/bin/env python3
"""Servidor local del portafolio SIN caché.

Correr:   python3 serve.py
Ver en:   http://localhost:8000  (Mac)
          http://<IP-de-tu-Mac>:8000  (teléfono, mismo WiFi)
          (la IP se imprime abajo al arrancar)
Detener:  Ctrl+C

Sirve los archivos con Cache-Control: no-store, así el teléfono
SIEMPRE baja la versión más reciente al recargar — nada de fotos viejas.
"""
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SinCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


def ip_local():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "?"


if __name__ == "__main__":
    print("Portafolio corriendo:")
    print("  Mac:      http://localhost:8000")
    print(f"  Teléfono: http://{ip_local()}:8000   (mismo WiFi)")
    print("Detener: Ctrl+C")
    ThreadingHTTPServer(("0.0.0.0", 8000), SinCacheHandler).serve_forever()
