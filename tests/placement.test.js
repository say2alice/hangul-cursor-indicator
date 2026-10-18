// SPDX-License-Identifier: GPL-2.0-or-later
import assert from 'node:assert/strict';
import {test} from 'node:test';

import {placeBadge, placeNearCaret} from '../src/placement.js';

const PRIMARY = {x: 0, y: 0, width: 1920, height: 1080};
const SECOND = {x: 1920, y: 0, width: 1920, height: 1080};
const NORMAL = {width: 18, height: 18};

const cases = [
    ['화면 가운데', {x: 500, y: 400}, NORMAL, PRIMARY, {x: 513, y: 408}],
    ['왼쪽 위 모서리', {x: 0, y: 0}, NORMAL, PRIMARY, {x: 13, y: 8}],
    ['오른쪽 가장자리', {x: 1910, y: 400}, NORMAL, PRIMARY, {x: 1884, y: 408}],
    ['아래 가장자리', {x: 500, y: 1075}, NORMAL, PRIMARY, {x: 513, y: 1049}],
    ['오른쪽 아래 모서리', {x: 1915, y: 1078}, NORMAL, PRIMARY, {x: 1889, y: 1052}],
    ['둘째 모니터', {x: 1930, y: 10}, NORMAL, SECOND, {x: 1943, y: 18}],
    ['둘째 모니터의 오른쪽 가장자리', {x: 3835, y: 10}, NORMAL, SECOND, {x: 3809, y: 18}],
];

for (const [name, pointer, size, monitor, expected] of cases) {
    test(name, () => {
        assert.deepEqual(placeBadge(pointer, size, monitor), expected);
    });
}

const caretCases = [
    ['캐럿 오른쪽 아래', {x: 500, y: 400, width: 2, height: 20}, PRIMARY, {x: 504, y: 422}],
    ['모니터 오른쪽 끝에서는 캐럿 왼쪽', {x: 1910, y: 400, width: 2, height: 20}, PRIMARY, {x: 1890, y: 422}],
    ['모니터 아래 끝에서는 캐럿 위', {x: 500, y: 1060, width: 2, height: 20}, PRIMARY, {x: 504, y: 1040}],
    ['모니터 위쪽의 캐럿', {x: 500, y: 0, width: 2, height: 10}, PRIMARY, {x: 504, y: 12}],
    ['둘째 모니터의 캐럿', {x: 2000, y: 400, width: 2, height: 20}, SECOND, {x: 2004, y: 422}],
];

for (const [name, caret, monitor, expected] of caretCases) {
    test(name, () => {
        assert.deepEqual(placeNearCaret(caret, NORMAL, monitor), expected);
    });
}
