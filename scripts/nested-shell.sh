#!/bin/sh
# 중첩 GNOME Shell을 실행합니다. 창을 닫으면 끝납니다.
# Wayland 디스플레이 이름을 hangul-dev로 고정하고, 세션 버스 주소를 local/nested/bus에 적어 nested-run.sh가 읽게 합니다.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$root/local/nested"
exec dbus-run-session -- sh -c 'echo "$DBUS_SESSION_BUS_ADDRESS" > "$1/local/nested/bus"; exec gnome-shell --devkit --wayland --wayland-display=hangul-dev' sh "$root"
