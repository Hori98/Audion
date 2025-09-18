#!/usr/bin/env bash
set -euo pipefail

# Simple smoke test for backend endpoints
# Usage: API=http://<IP>:8003 USER=test@example.com PASS=test123 ./scripts/smoke.sh

API_BASE="${API:-http://localhost:8003}"
USER_EMAIL="${USER:-test@example.com}"
USER_PASS="${PASS:-test123}"

echo "== Smoke: Health check =="
curl -fsS "$API_BASE/health" | jq . >/dev/null && echo "OK"

echo "== Smoke: Articles =="
curl -fsS "$API_BASE/api/articles" | jq '.[0]?' >/dev/null && echo "OK"

echo "== Smoke: Login =="
TOKEN=$(curl -fsS -X POST "$API_BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASS\"}" | jq -r .access_token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then echo "Login failed"; exit 1; fi
echo "OK"

echo "== Smoke: Start Auto-Pick task =="
TASK=$(curl -fsS -X POST "$API_BASE/api/auto-pick/create-audio" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"max_articles":3,"voice_language":"ja-JP","voice_name":"alloy"}' | jq -r .task_id)
if [ -z "$TASK" ] || [ "$TASK" = "null" ]; then echo "Task start failed"; exit 1; fi
echo "Task: $TASK"

echo "== Smoke: Poll task status (timeout 60s) =="
DEADLINE=$(( $(date +%s) + 60 ))
while :; do
  STATUS_JSON=$(curl -fsS "$API_BASE/api/auto-pick/task-status/$TASK?token=$TOKEN")
  STATUS=$(echo "$STATUS_JSON" | jq -r .status)
  PROG=$(echo "$STATUS_JSON" | jq -r .progress)
  echo "status=$STATUS progress=${PROG}%"
  if [ "$STATUS" = "completed" ]; then echo "OK"; break; fi
  if [ "$STATUS" = "failed" ]; then echo "FAILED"; echo "$STATUS_JSON"; exit 1; fi
  [ $(date +%s) -gt $DEADLINE ] && echo "Timeout" && exit 1
  sleep 3
done

echo "== Smoke: Library =="
curl -fsS -H "Authorization: Bearer $TOKEN" "$API_BASE/api/audio/library" | jq . >/dev/null && echo "OK"

echo "All smoke tests passed"

