// SPDX-License-Identifier: GPL-2.0-or-later
// Xcursor 파일의 머리말, 목차, 그림을 읽고, 셸이 보여 주는 커서 그림이 텍스트 커서인지 가립니다(ADR-0004).
// 파일 형식은 Xcursor(3) 매뉴얼의 FILE FORMAT 절을 따릅니다. 셸 모듈을 가져오지 않아 Node.js에서 시험합니다.

const MAGIC = 0x72756358; // 'Xcur'
const IMAGE_TYPE = 0xfffd0002;
const FILE_HEADER_SIZE = 16;
const TOC_ENTRY_SIZE = 12;
export const IMAGE_HEADER_SIZE = 36;

// 이보다 투명한 픽셀은 그림자로 보고 그림 범위에서 뺍니다(docs/design/architecture.md §5.2).
const ALPHA_THRESHOLD = 0x20;

/** 텍스트 커서로 보는 커서 이름입니다(FR-VS-02). */
export const TEXT_CURSOR_NAMES = Object.freeze(['text', 'xterm', 'ibeam', 'vertical-text']);

function view(bytes) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** 파일 앞 16바이트로 목차까지의 길이를 구합니다. Xcursor 파일이 아니면 `null`입니다. */
export function tocLength(head) {
    if (head.byteLength < FILE_HEADER_SIZE)
        return null;
    const v = view(head);
    if (v.getUint32(0, true) !== MAGIC)
        return null;
    return v.getUint32(4, true) + v.getUint32(12, true) * TOC_ENTRY_SIZE;
}

/** 목차에서 그림 덩어리의 위치를 꺼냅니다. */
export function imagePositions(toc) {
    const v = view(toc);
    const headerSize = v.getUint32(4, true);
    const count = v.getUint32(12, true);
    const positions = [];
    for (let i = 0; i < count; i++) {
        const offset = headerSize + i * TOC_ENTRY_SIZE;
        if (v.getUint32(offset, true) === IMAGE_TYPE)
            positions.push(v.getUint32(offset + 8, true));
    }
    return positions;
}

/** 그림 덩어리의 머리말(36바이트)을 읽습니다. `nominal`은 테마가 정한 커서 크기입니다. */
export function parseImageHeader(header) {
    const v = view(header);
    return {
        nominal: v.getUint32(8, true),
        width: v.getUint32(16, true),
        height: v.getUint32(20, true),
        xhot: v.getUint32(24, true),
        yhot: v.getUint32(28, true),
    };
}

/**
 * 그림이 실제로 그려진 범위를 핫스팟 기준의 거리(px)로 구합니다.
 * `chunk`는 그림 덩어리 전체(머리말과 픽셀)입니다. 그려진 픽셀이 없으면 `null`입니다.
 */
export function imageExtents(chunk) {
    const {width, height, xhot, yhot} = parseImageHeader(chunk);
    const v = view(chunk);
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = v.getUint32(IMAGE_HEADER_SIZE + (y * width + x) * 4, true) >>> 24;
            if (alpha <= ALPHA_THRESHOLD)
                continue;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }
    if (maxX < 0)
        return null;
    return {right: maxX - xhot, below: maxY - yhot, left: xhot - minX, above: yhot - minY};
}

/** 셸의 커서 그림과 테마 그림을 맞춰 볼 때 쓰는 키입니다. 크기와 핫스팟을 함께 씁니다. */
export function cursorKey({width, height, xhot, yhot}) {
    return `${width}x${height}+${xhot}+${yhot}`;
}

/**
 * 그림 목록으로 키별 표를 만듭니다.
 * 키가 같은 그림 가운데 텍스트 커서가 아닌 것이 하나라도 있으면 텍스트 커서로 보지 않습니다.
 * 끌기 같은 다른 커서에서 배지가 나오지 않게 하려는 것입니다(ADR-0004).
 */
export function buildTable(images) {
    const table = new Map();
    for (const image of images) {
        const key = cursorKey(image);
        const entry = table.get(key);
        if (!entry) {
            table.set(key, {isText: image.isText, nominal: image.nominal, extents: image.extents});
            continue;
        }
        entry.isText &&= image.isText;
        if (entry.isText)
            entry.extents = widest(entry.extents, image.extents);
    }
    return table;
}

function widest(a, b) {
    if (!a || !b)
        return a ?? b;
    return {
        right: Math.max(a.right, b.right),
        below: Math.max(a.below, b.below),
        left: Math.max(a.left, b.left),
        above: Math.max(a.above, b.above),
    };
}

// 화면 배율 때문에 셸이 테마 그림을 정수배로 키워 쓸 때가 있습니다(docs/design/development-environment.md §6).
const SPRITE_SCALES = [1, 2, 3, 4];

/**
 * 셸이 준 커서 그림이 텍스트 커서이면 표의 항목을, 아니면 `null`을 돌려줍니다.
 * 그대로 찾고, 없으면 크기와 핫스팟이 나누어떨어지는 배율로 줄여 찾습니다.
 */
export function findTextCursor(table, sprite) {
    for (const scale of SPRITE_SCALES) {
        const values = [sprite.width, sprite.height, sprite.xhot, sprite.yhot];
        if (values.some(value => value % scale !== 0))
            continue;
        const [width, height, xhot, yhot] = values.map(value => value / scale);
        const entry = table.get(cursorKey({width, height, xhot, yhot}));
        if (entry)
            return entry.isText && entry.extents ? entry : null;
    }
    return null;
}

/**
 * 텍스트 커서 그림에 맞춘 배지 간격(px)입니다. 오른쪽과 왼쪽, 위는 그림 끝에서 2px 떨어지고,
 * 아래는 그림 아래 끝의 절반에서 2px 더 내려 배지가 커서 옆에서 조금 아래에 붙습니다. 근거는 docs/design/badge-design.md §3.1에 있습니다.
 */
export function gapFor(entry, cursorSize) {
    const scale = cursorSize / entry.nominal;
    const {right, below, left, above} = entry.extents;
    return {
        right: Math.round(right * scale) + 2,
        down: Math.floor(below * scale / 2) + 2,
        left: Math.round(left * scale) + 2,
        up: Math.round(above * scale) + 2,
    };
}
