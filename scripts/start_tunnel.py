"""
IslamTimeWorldBot — Auto HTTPS Tunnel Starter
Tries cloudflared first, then ngrok
Auto-updates .env with the public HTTPS URL
Run: python scripts/start_tunnel.py
"""

import subprocess
import threading
import time
import re
import sys
import os
import json
from pathlib import Path
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
ENV_FILE = BASE_DIR / ".env"

# ── Find executables ─────────────────────────────────────────────────────────
def find_exe(names):
    import shutil
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    # WinGet packages folder
    winget_dir = Path(os.environ.get("LOCALAPPDATA","")) / "Microsoft" / "WinGet" / "Packages"
    if winget_dir.exists():
        for name in names:
            found = list(winget_dir.rglob(name + ".exe"))
            if found:
                return str(found[0])
    return None

# ── Update .env ──────────────────────────────────────────────────────────────
def update_env(url):
    text = ENV_FILE.read_text(encoding="utf-8") if ENV_FILE.exists() else ""
    lines = text.splitlines()
    new_lines = []
    replaced = False
    for line in lines:
        if line.strip().startswith("WEBAPP_URL") or line.strip().startswith("# WEBAPP_URL"):
            new_lines.append("WEBAPP_URL=" + url)
            replaced = True
        else:
            new_lines.append(line)
    if not replaced:
        new_lines.append("WEBAPP_URL=" + url)
    ENV_FILE.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    print("✅ .env updated: WEBAPP_URL=" + url)

# ── cloudflared ──────────────────────────────────────────────────────────────
def run_cloudflared(cf_path):
    print("🌐 Starting cloudflared tunnel on port 8080…")
    url_found = {"url": None}
    url_re = re.compile(r'https://[a-zA-Z0-9\-]+\.trycloudflare\.com')

    def read_output(proc):
        for raw in proc.stderr:
            try:
                line = raw.decode("utf-8", errors="replace").strip()
            except Exception:
                line = str(raw)
            if line:
                print("  [cf] " + line[-120:])
            m = url_re.search(line)
            if m and not url_found["url"]:
                url_found["url"] = m.group(0)

    proc = subprocess.Popen(
        [cf_path, "tunnel", "--url", "http://localhost:8080"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    t = threading.Thread(target=read_output, args=(proc,), daemon=True)
    t.start()

    # Wait up to 20 seconds for URL
    for _ in range(40):
        if url_found["url"]:
            break
        time.sleep(0.5)

    if url_found["url"]:
        print("\n🎉 HTTPS URL: " + url_found["url"])
        update_env(url_found["url"])
        return proc, url_found["url"]
    else:
        proc.terminate()
        return None, None

# ── ngrok ────────────────────────────────────────────────────────────────────
def run_ngrok_with_token(ng_path):
    token = input("\nngrok authtoken (free at ngrok.com/signup): ").strip()
    if not token:
        return None, None
    subprocess.run([ng_path, "config", "add-authtoken", token], check=True)
    print("🌐 Starting ngrok tunnel on port 8080…")
    proc = subprocess.Popen(
        [ng_path, "http", "8080"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(5)
    try:
        req  = urllib.request.urlopen("http://localhost:4040/api/tunnels", timeout=5)
        data = json.loads(req.read())
        for t in data.get("tunnels", []):
            if t.get("proto") == "https":
                url = t["public_url"]
                print("🎉 HTTPS URL: " + url)
                update_env(url)
                return proc, url
    except Exception as e:
        print("ngrok API error: " + str(e))
    proc.terminate()
    return None, None

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print(" IslamTimeWorldBot — HTTPS Tunnel Setup")
    print("=" * 60)

    cf_path = find_exe(["cloudflared"])
    ng_path = find_exe(["ngrok"])

    proc = None
    url  = None

    if cf_path:
        print("✅ cloudflared found: " + cf_path)
        proc, url = run_cloudflared(cf_path)
    elif ng_path:
        print("✅ ngrok found: " + ng_path)
        proc, url = run_ngrok_with_token(ng_path)
    else:
        print("❌ Neither cloudflared nor ngrok found.")
        print("   Install: winget install Cloudflare.cloudflared")
        return

    if not url:
        print("❌ Could not get HTTPS URL")
        return

    print("\n" + "=" * 60)
    print("✅ HTTPS tunnel active!")
    print("   Public URL: " + url)
    print("")
    print("Next steps:")
    print("  1. Restart the bot:  python -u bot.py")
    print("  2. Send /start in Telegram")
    print("  3. Open WebApp button")
    print("")
    print("Press Ctrl+C to stop the tunnel")
    print("=" * 60)

    try:
        while True:
            time.sleep(30)
            # Check tunnel is alive
            if proc and proc.poll() is not None:
                print("⚠️  Tunnel process died, restarting…")
                if cf_path:
                    proc, url = run_cloudflared(cf_path)
    except KeyboardInterrupt:
        print("\n🛑 Stopping tunnel…")
        if proc:
            proc.terminate()

if __name__ == "__main__":
    main()
