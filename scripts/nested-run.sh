#!/bin/sh
# nested-shell.sh로 실행한 중첩 셸 안에서 명령을 실행합니다.
# 예: scripts/nested-run.sh gnome-extensions enable hangul-cursor-indicator@way2java.net
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
bus_file="$root/local/nested/bus"
if [ ! -s "$bus_file" ]; then
    echo "중첩 셸이 실행 중이 아닙니다. scripts/nested-shell.sh를 먼저 실행합니다." >&2
    exit 1
fi
exec env -u DISPLAY WAYLAND_DISPLAY=hangul-dev GDK_BACKEND=wayland DBUS_SESSION_BUS_ADDRESS="$(cat "$bus_file")" "$@"
