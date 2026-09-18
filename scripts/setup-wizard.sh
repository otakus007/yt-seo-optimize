#!/usr/bin/env bash
# Walks the owner through the one-time setup that only a human can do.
# Re-runnable; each step checks what is already done.
set -u
cd "$(dirname "$0")/.."
ENV=.env; [ -f $ENV ] || cp .env.example $ENV
getv() { grep -E "^$1=" $ENV | head -1 | cut -d= -f2- | sed 's/ *#.*//' | xargs; }
setv() { if grep -qE "^$1=" $ENV; then sed -i "s|^$1=.*|$1=$2|" $ENV; else echo "$1=$2" >> $ENV; fi; }
ask() { local cur; cur=$(getv "$1"); read -r -p "$2 [${cur:-empty}]: " val; [ -n "$val" ] && setv "$1" "$val"; }
step() { echo; echo "── $1"; }

step "1/6 YouTube Data API key (public data, competitors)"
echo "  console.cloud.google.com → APIs & Services → Enable 'YouTube Data API v3' → Credentials → API key"
ask YOUTUBE_API_KEY "Paste API key"

step "2/6 OAuth client (own channels: Analytics, revenue, write access)"
echo "  Same project → Enable 'YouTube Analytics API' → OAuth consent screen (External, add your Google emails as test users)"
echo "  → Credentials → Create OAuth client ID → Web application → Authorized redirect URIs:"
echo "     http://localhost:3000/api/oauth/callback"
echo "     https://<your-domain>/api/oauth/callback   (only if you use the Cloudflare Tunnel)"
echo "  Note: a consent screen in 'Testing' expires refresh tokens after 7 days → set Publishing status to 'In production'."
ask GOOGLE_CLIENT_ID "Client ID"
ask GOOGLE_CLIENT_SECRET "Client secret"

step "3/6 Token encryption key"
if [ -z "$(getv TOKEN_KEY)" ]; then setv TOKEN_KEY "$(openssl rand -hex 32)"; echo "  generated TOKEN_KEY (never rotate it, or stored tokens become unreadable; back up .env)"; else echo "  already set"; fi

step "4/6 Cloudflare Tunnel + Access (optional, remote use)"
echo "  one.dash.cloudflare.com → Networks → Tunnels → create, route https://<domain> → http://localhost:3000"
echo "  → Access → Applications → Self-hosted, domain <domain>, policy: Allow, Emails = your email"
echo "  → Application overview shows the AUD tag; team name is <team>.cloudflareaccess.com"
ask PUBLIC_ORIGIN "Public origin (https://yt.example.com) or leave empty"
[ -n "$(getv PUBLIC_ORIGIN)" ] && { ask CF_ACCESS_TEAM "Access team domain (<team>.cloudflareaccess.com)"; ask CF_ACCESS_AUD "Access application AUD"; }

step "5/6 Database + first connect"
pnpm prisma migrate deploy >/dev/null && echo "  data/app.db ready"
echo "  Now: pnpm dev → http://localhost:3000 → 'Connect a YouTube channel' (once per Google account)"
echo "  then: pnpm sync   (first run backfills Analytics from the channel start; minutes)"

step "6/6 Cron (daily sync + backup)"
echo "  add with: crontab -e"
echo "    15 6 * * *  cd $(pwd) && pnpm sync  >> data/cron.log 2>&1"
echo "    45 6 * * *  cd $(pwd) && pnpm backup >> data/cron.log 2>&1"
echo
echo "Done. Weekly: export Studio → Analytics → Content → CSV and import it on the home page (impressions/CTR)."
