#!/usr/bin/env python3
"""Servidor local del portafolio SIN caché.

Correr:   python3 serve.py
Ver en:   http://localhost:8000  (Mac)
          http://<IP-de-tu-Mac>:8000  (teléfono, mismo WiFi)
          (la IP se imprime abajo al arrancar)
Detener:  Ctrl+C

Sirve los archivos con Cache-Control: no-store, así el teléfono
SIEMPRE baja la versión más reciente al recargar — nada de fotos viejas.

También entiende peticiones "Range" (como Vercel), que es lo que usan
los videos para adelantarse: sin eso, el episodio de Trisol no podría
saltar al bloque que tocas.
"""
import os
import re
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SinCacheHandler(SimpleHTTPRequestHandler):
    _pendiente = None  # bytes que faltan por mandar en una respuesta parcial

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        rango = self.headers.get("Range")
        ruta = self.translate_path(self.path)
        if not rango or os.path.isdir(ruta):
            return super().send_head()
        m = re.match(r"bytes=(\d*)-(\d*)$", rango.strip())
        if not m or not (m.group(1) or m.group(2)):
            return super().send_head()
        try:
            f = open(ruta, "rb")
        except OSError:
            self.send_error(404, "Archivo no encontrado")
            return None
        total = os.fstat(f.fileno()).st_size
        if m.group(1):
            inicio = int(m.group(1))
            fin = min(int(m.group(2)), total - 1) if m.group(2) else total - 1
        else:  # "bytes=-500": los últimos 500 bytes
            inicio = max(0, total - int(m.group(2)))
            fin = total - 1
        if inicio > fin or inicio >= total:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{total}")
            self.end_headers()
            return None
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(ruta))
        self.send_header("Content-Range", f"bytes {inicio}-{fin}/{total}")
        self.send_header("Content-Length", str(fin - inicio + 1))
        self.end_headers()
        f.seek(inicio)
        self._pendiente = fin - inicio + 1
        return f

    def copyfile(self, source, outputfile):
        try:
            if self._pendiente is None:
                return super().copyfile(source, outputfile)
            restante, self._pendiente = self._pendiente, None
            while restante > 0:
                trozo = source.read(min(64 * 1024, restante))
                if not trozo:
                    break
                outputfile.write(trozo)
                restante -= len(trozo)
        except (BrokenPipeError, ConnectionResetError):
            pass  # el navegador cortó la descarga (normal con videos)


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
