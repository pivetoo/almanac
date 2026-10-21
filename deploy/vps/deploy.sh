#!/usr/bin/env bash
# Aplica a versao mais recente da imagem (pull do GHCR + up -d). Chamado pelo timer de poll (a cada 30s).
# flock evita execucoes concorrentes; so faz prune quando algo realmente mudou.
set -euo pipefail
exec 9>/var/lock/almanac-deploy.lock
flock -n 9 || { echo "deploy already running, skipping"; exit 0; }
cd "$(dirname "$(readlink -f "$0")")"
before=$(docker compose -f docker-compose.prod.yml images -q 2>/dev/null | sort | tr '\n' ' ')
docker compose -f docker-compose.prod.yml pull -q
docker compose -f docker-compose.prod.yml up -d --remove-orphans
after=$(docker compose -f docker-compose.prod.yml images -q 2>/dev/null | sort | tr '\n' ' ')
if [ "$before" != "$after" ]; then
  docker image prune -f >/dev/null 2>&1 || true
  echo "[deploy] $(date -u '+%Y-%m-%d %H:%M:%S UTC') updated"
else
  echo "[deploy] $(date -u '+%Y-%m-%d %H:%M:%S UTC') no change"
fi
