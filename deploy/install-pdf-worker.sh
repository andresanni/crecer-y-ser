set -eu
stage="${1:?}"
release="${2:?}"
case "$stage" in /root/cys-pdf-*) ;; *) exit 2 ;; esac
case "$release" in *[!0-9-]*|'') exit 2 ;; esac
test -f "$stage/worker.tar.gz"
if ! test -x /opt/cys-node/bin/node; then
  version="$(curl -fsS https://nodejs.org/dist/index.json | python3 -c 'import json,sys; print(next(x["version"] for x in json.load(sys.stdin) if x["version"].startswith("v24.") and x["lts"]))')"
  archive="node-$version-linux-x64.tar.xz"
  curl -fsS "https://nodejs.org/dist/$version/$archive" -o "$stage/$archive"
  curl -fsS "https://nodejs.org/dist/$version/SHASUMS256.txt" -o "$stage/SHASUMS256.txt"
  (cd "$stage" && grep " $archive$" SHASUMS256.txt | sha256sum -c -)
  install -d /opt/cys-node
  tar -xJf "$stage/$archive" -C /opt/cys-node --strip-components=1
fi
export PATH="/opt/cys-node/bin:$PATH"
id cys-pdf >/dev/null 2>&1 || useradd --system --home /var/lib/cys-pdf --shell /usr/sbin/nologin cys-pdf
install -d -o cys-pdf -g cys-pdf -m 0700 /var/lib/cys-pdf
target="/opt/cys-pdf/releases/$release"
install -d -m 0755 "$target" /opt/cys-pdf/browsers
tar -xzf "$stage/worker.tar.gz" -C "$target"
cd "$target"
npm ci --include=dev --no-audit --no-fund
PLAYWRIGHT_BROWSERS_PATH=/opt/cys-pdf/browsers node node_modules/playwright-core/cli.js install --with-deps chromium
chmod -R a+rX /opt/cys-pdf/browsers
if ! test -f /etc/cys-pdf.env; then
  umask 077
  python3 -c 'import secrets; print("CYS_PDF_WORKER_KEY="+secrets.token_hex(32)); print("CYS_PDF_ORIGINS=https://crecer-y-ser-ten.vercel.app")' > /etc/cys-pdf.env
fi
chmod 0600 /etc/cys-pdf.env
install -m 0644 "$stage/pdf-worker.service" /etc/systemd/system/cys-pdf.service
if test -L /opt/cys-pdf/current; then readlink /opt/cys-pdf/current > "$stage/previous-release"; fi
ln -sfn "$target" /opt/cys-pdf/current
systemctl daemon-reload
systemctl enable cys-pdf
systemctl restart cys-pdf
attempt=0
until curl -fsS http://127.0.0.1:8093/health; do
  attempt=$((attempt + 1))
  test "$attempt" -lt 20 || exit 1
  sleep 1
done
node --version
