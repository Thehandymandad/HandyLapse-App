#!/usr/bin/env bash
# Installa le skill pubbliche usate dall'editor (guida "Come edito i miei video con l'AI"):
#   - Video Use (github.com/browser-use/video-use): trascrizione Scribe, tagli sulle parole, render del montato
#   - HyperFrames (hyperframes.heygen.com): grafiche HTML + GSAP renderizzate in video, + media-use
# Idempotente: se è già tutto installato non fa nulla. Le 5 skill custom (motion-*) sono già nel repo.
#
# Uso:  bash editor/setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS="$ROOT/.claude/skills"
VIDEO_USE="$SKILLS/video-use"
HYPERFRAMES_VERSION="${HYPERFRAMES_VERSION:-0.8.214}"

mkdir -p "$SKILLS"

# requisiti di sistema
for bin in ffmpeg ffprobe node npx python3 git; do
  command -v "$bin" >/dev/null || { echo "Manca $bin: installalo prima di continuare." >&2; exit 1; }
done
node -e 'process.exit(+process.versions.node.split(".")[0] < 22)' || { echo "HyperFrames richiede Node.js 22+." >&2; exit 1; }

# 1. Video Use: la cartella intera dentro .claude/skills (SKILL.md e helpers/ devono stare insieme)
if [ ! -f "$VIDEO_USE/SKILL.md" ]; then
  git clone --depth 1 https://github.com/browser-use/video-use "$VIDEO_USE"
fi
if [ ! -f "$VIDEO_USE/.deps-ok" ]; then
  if command -v uv >/dev/null; then
    (cd "$VIDEO_USE" && uv pip install --system -q -r <(python3 -c 'import tomllib;print("\n".join(tomllib.load(open("pyproject.toml","rb"))["project"]["dependencies"]))'))
  else
    python3 -m pip install -q requests librosa matplotlib pillow numpy
  fi
  touch "$VIDEO_USE/.deps-ok"
fi

# 2. HyperFrames: skill core (/hyperframes, /hyperframes-cli, /hyperframes-registry, /media-use) nel progetto
if [ ! -f "$SKILLS/hyperframes/SKILL.md" ]; then
  (cd "$ROOT" && npx --yes "hyperframes@$HYPERFRAMES_VERSION" skills update)
fi

echo "Editor pronto: skill in $SKILLS"
ls "$SKILLS"
