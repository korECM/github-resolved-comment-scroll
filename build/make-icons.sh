#!/usr/bin/env bash
# 원본 PNG → 확장 아이콘 16/48/128 생성. 사용법: build/make-icons.sh <source.png>
set -euo pipefail
SRC="${1:-extension/icons/source.png}"
OUT="extension/icons"
for s in 16 48 128; do
  sips -z "$s" "$s" "$SRC" --out "$OUT/icon-$s.png" >/dev/null
  echo "✓ icon-$s.png"
done
