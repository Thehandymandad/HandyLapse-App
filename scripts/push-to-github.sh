#!/bin/bash
# Dopo aver creato il repo su https://github.com/new (es. nome: handylapse-app, pubblico)
# sostituisci TUO_USERNAME con il tuo username GitHub e lancia:
#   chmod +x scripts/push-to-github.sh && ./scripts/push-to-github.sh

REPO_NAME="${1:-handylapse-app}"
GITHUB_USER="${2:-}"

if [ -z "$GITHUB_USER" ]; then
  echo "Uso: ./scripts/push-to-github.sh [nome-repo] [tuo-username-github]"
  echo "Es:  ./scripts/push-to-github.sh handylapse-app lucabielli"
  exit 1
fi

set -e
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
git push -u origin main
echo "Push su GitHub completato: https://github.com/${GITHUB_USER}/${REPO_NAME}"
