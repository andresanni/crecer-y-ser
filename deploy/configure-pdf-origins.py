import datetime
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from urllib.parse import urlsplit


def configure(origins):
    if not origins:
        raise ValueError("Se requiere al menos un origen HTTPS.")
    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment or any(char in origin for char in "\r\n,* "):
            raise ValueError("Origen HTTPS inválido.")
        parsed.port
    config = Path("/etc/cys-pdf.env")
    original = config.read_text()
    lines = original.splitlines()
    if not any(line.startswith("CYS_PDF_WORKER_KEY=") for line in lines):
        raise ValueError("Falta la clave existente del worker.")
    lines = [line for line in lines if not line.startswith("CYS_PDF_ORIGINS=")]
    lines.append("CYS_PDF_ORIGINS=" + ",".join(dict.fromkeys(origins)))
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    backup = Path("/root/pb/deploy_backups") / ("pdf-origins-" + stamp)
    backup.mkdir(mode=0o700)
    shutil.copy2(config, backup / "cys-pdf.env")
    os.chmod(backup / "cys-pdf.env", 0o600)
    descriptor, temporary = tempfile.mkstemp(dir=config.parent, prefix=".cys-pdf-")
    with os.fdopen(descriptor, "w") as file:
        file.write("\n".join(lines) + "\n")
    os.replace(temporary, config)
    try:
        subprocess.run(["systemctl", "restart", "cys-pdf"], check=True)
        for attempt in range(20):
            try:
                with urllib.request.urlopen("http://127.0.0.1:8093/health", timeout=2) as response:
                    if response.status == 200:
                        print(json.dumps({"origins": origins, "backup": str(backup), "health": "ok"}))
                        return
            except OSError:
                time.sleep(1)
        raise RuntimeError("El worker no superó el health check.")
    except Exception:
        shutil.copy2(backup / "cys-pdf.env", config)
        subprocess.run(["systemctl", "restart", "cys-pdf"], check=True)
        raise


if __name__ == "__main__":
    configure(sys.argv[1:])
