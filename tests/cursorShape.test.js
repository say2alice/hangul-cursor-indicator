// SPDX-License-Identifier: GPL-2.0-or-later
import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
    IMAGE_HEADER_SIZE, buildTable, findTextCursor, gapFor, imageExtents, imagePositions,
    parseImageHeader, tocLength,
} from '../src/cursorShape.js';

// 시험용 Xcursor 데이터를 만듭니다. rect 안의 픽셀만 불투명하고, shadow 안은 거의 투명합니다.
function makeXcursor(images) {
    const chunks = images.map(({nominal, width, height, xhot, yhot, rect, shadow}) => {
        const bytes = new Uint8Array(IMAGE_HEADER_SIZE + width * height * 4);
        const v = new DataView(bytes.buffer);
        [IMAGE_HEADER_SIZE, 0xfffd0002, nominal, 1, width, height, xhot, yhot, 0]
            .forEach((value, i) => v.setUint32(i * 4, value, true));
        const inside = (r, x, y) => r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let pixel = 0;
                if (inside(rect, x, y))
                    pixel = 0xff000000;
                else if (inside(shadow, x, y))
                    pixel = 0x10000000;
                v.setUint32(IMAGE_HEADER_SIZE + (y * width + x) * 4, pixel, true);
            }
        }
        return bytes;
    });
    const tocSize = 16 + chunks.length * 12;
    const total = tocSize + chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const file = new Uint8Array(total);
    const v = new DataView(file.buffer);
    [0x72756358, 16, 0x10000, chunks.length].forEach((value, i) => v.setUint32(i * 4, value, true));
    let position = tocSize;
    chunks.forEach((chunk, i) => {
        v.setUint32(16 + i * 12, 0xfffd0002, true);
        v.setUint32(16 + i * 12 + 4, images[i].nominal, true);
        v.setUint32(16 + i * 12 + 8, position, true);
        file.set(chunk, position);
        position += chunk.byteLength;
    });
    return file;
}

// Yaru I빔(크기 24)과 같은 크기, 핫스팟, 그림 범위입니다.
const IBEAM = {nominal: 24, width: 24, height: 24, xhot: 11, yhot: 12, rect: {x0: 7, x1: 13, y0: 3, y1: 20}};

function chunkAt(file, position) {
    const {width, height} = parseImageHeader(file.subarray(position, position + IMAGE_HEADER_SIZE));
    return file.subarray(position, position + IMAGE_HEADER_SIZE + width * height * 4);
}

test('Xcursor가 아니면 목차 길이가 null입니다', () => {
    assert.equal(tocLength(new Uint8Array(16)), null);
});

test('목차와 그림 머리말을 읽습니다', () => {
    const file = makeXcursor([IBEAM, {...IBEAM, nominal: 48, width: 48, height: 48, xhot: 21, yhot: 23}]);
    assert.equal(tocLength(file.subarray(0, 16)), 16 + 2 * 12);
    const positions = imagePositions(file);
    assert.equal(positions.length, 2);
    assert.deepEqual(parseImageHeader(file.subarray(positions[1], positions[1] + IMAGE_HEADER_SIZE)),
        {nominal: 48, width: 48, height: 48, xhot: 21, yhot: 23});
});

test('그림 범위는 핫스팟 기준이고 거의 투명한 그림자는 뺍니다', () => {
    const file = makeXcursor([{...IBEAM, shadow: {x0: 0, x1: 23, y0: 0, y1: 23}}]);
    const [position] = imagePositions(file);
    assert.deepEqual(imageExtents(chunkAt(file, position)), {right: 2, below: 8, left: 4, above: 9});
});

test('그려진 픽셀이 없으면 범위가 null입니다', () => {
    const file = makeXcursor([{...IBEAM, rect: null}]);
    const [position] = imagePositions(file);
    assert.equal(imageExtents(chunkAt(file, position)), null);
});

const IBEAM_EXTENTS = {right: 2, below: 8, left: 4, above: 9};
const SPRITE = {width: 24, height: 24, xhot: 11, yhot: 12};

test('텍스트 커서 그림을 찾습니다', () => {
    const table = buildTable([{...IBEAM, isText: true, extents: IBEAM_EXTENTS}]);
    assert.equal(findTextCursor(table, SPRITE).nominal, 24);
});

test('같은 키에 텍스트가 아닌 커서가 있으면 텍스트 커서로 보지 않습니다', () => {
    const table = buildTable([
        {...IBEAM, isText: true, extents: IBEAM_EXTENTS},
        {...IBEAM, isText: false, extents: null},
    ]);
    assert.equal(findTextCursor(table, SPRITE), null);
});

test('정수배로 키운 그림도 찾습니다', () => {
    const table = buildTable([{...IBEAM, isText: true, extents: IBEAM_EXTENTS}]);
    assert.equal(findTextCursor(table, {width: 48, height: 48, xhot: 22, yhot: 24}).nominal, 24);
});

test('키운 그림이 텍스트가 아닌 커서와 겹치면 null입니다', () => {
    const table = buildTable([
        {...IBEAM, isText: true, extents: IBEAM_EXTENTS},
        {nominal: 24, width: 24, height: 24, xhot: 4, yhot: 4, isText: false, extents: null},
    ]);
    assert.equal(findTextCursor(table, {width: 48, height: 48, xhot: 8, yhot: 8}), null);
});

test('표에 없는 커서는 null입니다', () => {
    const table = buildTable([{...IBEAM, isText: true, extents: IBEAM_EXTENTS}]);
    assert.equal(findTextCursor(table, {width: 24, height: 24, xhot: 4, yhot: 4}), null);
});

test('I빔 간격은 (4, 6)이고 반대쪽은 (6, 11)입니다', () => {
    assert.deepEqual(gapFor({nominal: 24, extents: IBEAM_EXTENTS}, 24), {right: 4, down: 6, left: 6, up: 11});
});

test('큰 그림은 커서 크기로 환산합니다', () => {
    const doubled = {right: 4, below: 16, left: 8, above: 18};
    assert.deepEqual(gapFor({nominal: 48, extents: doubled}, 24), {right: 4, down: 6, left: 6, up: 11});
    assert.deepEqual(gapFor({nominal: 24, extents: IBEAM_EXTENTS}, 48), {right: 6, down: 10, left: 10, up: 20});
});
