#!/bin/sh
# 확장 패키지를 dist/에 만듭니다. gnome-extensions pack이 자동으로 넣지 않는 src/의 모듈과 스타일시트는 --extra-source로 넣습니다.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$root/dist"
set --
for f in "$root"/src/*.js "$root"/src/*.css; do
    [ -e "$f" ] || continue
    name=$(basename "$f")
    case "$name" in
        extension.js | prefs.js | stylesheet.css) ;;
        *) set -- "$@" "--extra-source=$name" ;;
    esac
done
gnome-extensions pack "$root/src" --force --out-dir="$root/dist" "$@"
ls "$root"/dist/*.shell-extension.zip
