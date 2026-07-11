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
echo "→ Перезапуск контейнеров (blue-green: новый стартует до остановки старого)…"
sudo docker rm -f stretcher-api-new stretcher-app-new 2>/dev/null || true
sudo docker run -d --name stretcher-api-new \
  --network community_default \
  -v /var/lib/stretcher:/data \
  --env-file /etc/stretcher/api.env \
  stretcher-api
sudo docker run -d --name stretcher-app-new \
  --network community_default \
  stretcher-webapp
# ждём готовности нового API, затем мгновенная подмена имён (docker DNS)
for i in $(seq 1 20); do
  sudo docker exec community-proxy-1 wget -qO /dev/null http://stretcher-api-new:8080/api/health && break
  sleep 1
done
sudo docker rm -f stretcher-api stretcher-app 2>/dev/null || true
sudo docker rename stretcher-api-new stretcher-api
sudo docker rename stretcher-app-new stretcher-app
sudo docker update --restart unless-stopped stretcher-api stretcher-app >/dev/null
# Grafana stretcher: конфиги примонтированы из репозитория — перезапуск подхватывает
if sudo docker ps -a --format "{{.Names}}" | grep -q "^grafana-stretcher$"; then
  sudo docker restart grafana-stretcher >/dev/null
fi
sleep 3
sudo docker exec community-proxy-1 wget -qO- http://stretcher-api:8080/api/health
echo
sudo docker exec community-proxy-1 wget -q --spider http://stretcher-app:80/ && echo "webapp: ok"'

echo "✓ Деплой завершён: https://true-scale.ru"
