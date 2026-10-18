#!/bin/sh
# 확장 패키지를 dist/에 만듭니다. extension.js와 metadata.json 외의 src/ 모듈은 --extra-source로 넣습니다.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$root/dist"
set --
for f in "$root"/src/*.js; do
    name=$(basename "$f")
    case "$name" in
        extension.js | prefs.js) ;;
        *) set -- "$@" "--extra-source=$name" ;;
    esac
done
gnome-extensions pack "$root/src" --force --out-dir="$root/dist" "$@"
ls "$root"/dist/*.shell-extension.zip
