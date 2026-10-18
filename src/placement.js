// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * 커서 그림 범위를 모를 때 쓰는, 포인터 끝에서 배지까지의 간격(px)입니다.
 * 보통은 텍스트 커서 그림에 맞춘 간격(cursorShape.js의 gapFor)을 넘겨받습니다.
 * 값의 근거는 docs/design/architecture.md §5.2에 있습니다.
 */
export const DEFAULT_GAP = Object.freeze({right: 13, down: 8, left: 8, up: 8});

/**
 * 배지를 포인터 오른쪽 아래에 두고, 모니터를 벗어나면 반대쪽으로 옮깁니다(FR-PS-01, FR-PS-03).
 */
export function placeBadge(pointer, size, monitor, gap = DEFAULT_GAP) {
    let x = pointer.x + gap.right;
    if (x + size.width > monitor.x + monitor.width)
        x = pointer.x - gap.left - size.width;

    let y = pointer.y + gap.down;
    if (y + size.height > monitor.y + monitor.height)
        y = pointer.y - gap.up - size.height;

    return {
        x: clamp(x, monitor.x, monitor.x + monitor.width - size.width),
        y: clamp(y, monitor.y, monitor.y + monitor.height - size.height),
    };
}

// 텍스트 캐럿과 배지 사이의 간격(px)입니다(FR-VS-04).
export const CARET_GAP = 2;

/**
 * 배지를 텍스트 캐럿 오른쪽 아래에 둡니다. 입력 중인 줄의 글자를 가리지 않기 위해서입니다.
 * 모니터 오른쪽을 벗어나면 캐럿 왼쪽으로, 아래를 벗어나면 캐럿 위로 옮깁니다(FR-VS-04).
 */
export function placeNearCaret(caret, size, monitor, gap = CARET_GAP) {
    let x = caret.x + caret.width + gap;
    if (x + size.width > monitor.x + monitor.width)
        x = caret.x - gap - size.width;
    let y = caret.y + caret.height + gap;
    if (y + size.height > monitor.y + monitor.height)
        y = caret.y - gap - size.height;

    return {
        x: clamp(x, monitor.x, monitor.x + monitor.width - size.width),
        y: clamp(y, monitor.y, monitor.y + monitor.height - size.height),
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
