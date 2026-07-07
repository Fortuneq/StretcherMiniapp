#!/usr/bin/env bash
# Деплой stretcher на gas2.
# Правило: код попадает на сервер ТОЛЬКО через git — сначала пуш в GitHub,
# затем git pull на сервере и сборка контейнеров из /opt/stretcher.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n $(git status --porcelain) ]]; then
  echo "✗ Рабочее дерево грязное — сначала закоммить и запушь изменения." >&2
  exit 1
fi
git push origin main

ssh -A gas2 'set -e
cd /opt/stretcher
git pull --ff-only
echo "→ Сборка образов…"
sudo docker build -q -t stretcher-api ./api
sudo docker build -q -t stretcher-webapp ./miniapp
echo "→ Перезапуск контейнеров…"
sudo docker rm -f stretcher-api stretcher-app 2>/dev/null || true
sudo docker run -d --name stretcher-api --restart unless-stopped \
  --network community_default \
  -v /var/lib/stretcher:/data \
  --env-file /etc/stretcher/api.env \
  stretcher-api
sudo docker run -d --name stretcher-app --restart unless-stopped \
  --network community_default \
  stretcher-webapp
# Grafana stretcher: конфиги примонтированы из репозитория — перезапуск подхватывает
if sudo docker ps -a --format "{{.Names}}" | grep -q "^grafana-stretcher$"; then
  sudo docker restart grafana-stretcher >/dev/null
fi
sleep 3
sudo docker exec community-proxy-1 wget -qO- http://stretcher-api:8080/api/health
echo
sudo docker exec community-proxy-1 wget -q --spider http://stretcher-app:80/ && echo "webapp: ok"'

echo "✓ Деплой завершён: https://true-scale.ru"
