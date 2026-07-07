#!/usr/bin/env bash
# Деплой flexi на gas2.
# Правило: код попадает на сервер ТОЛЬКО через git — сначала пуш в GitHub,
# затем git pull на сервере и сборка контейнеров из /opt/flexi.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n $(git status --porcelain) ]]; then
  echo "✗ Рабочее дерево грязное — сначала закоммить и запушь изменения." >&2
  exit 1
fi
git push origin main

ssh -A gas2 'set -e
cd /opt/flexi
git pull --ff-only
echo "→ Сборка образов…"
sudo docker build -q -t flexi-api ./api
sudo docker build -q -t flexi-webapp ./miniapp
echo "→ Перезапуск контейнеров…"
sudo docker rm -f flexi-api flexi-app 2>/dev/null || true
sudo docker run -d --name flexi-api --restart unless-stopped \
  --network community_default \
  -v /var/lib/flexi:/data \
  --env-file /etc/flexi/api.env \
  flexi-api
sudo docker run -d --name flexi-app --restart unless-stopped \
  --network community_default \
  flexi-webapp
# Grafana flexi: конфиги примонтированы из репозитория — перезапуск подхватывает
if sudo docker ps -a --format "{{.Names}}" | grep -q "^grafana-flexi$"; then
  sudo docker restart grafana-flexi >/dev/null
fi
sleep 3
sudo docker exec community-proxy-1 wget -qO- http://flexi-api:8080/api/health
echo
sudo docker exec community-proxy-1 wget -q --spider http://flexi-app:80/ && echo "webapp: ok"'

echo "✓ Деплой завершён: https://true-scale.ru"
