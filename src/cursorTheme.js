// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {
    IMAGE_HEADER_SIZE, TEXT_CURSOR_NAMES, buildTable, imageExtents, imagePositions,
    parseImageHeader, tocLength,
} from './cursorShape.js';

/**
 * 커서 테마의 그림 표를 만듭니다(ADR-0004). 테마를 찾지 못하면 빈 표입니다.
 * 텍스트 커서 파일만 통째로 읽고, 나머지는 머리말과 목차만 읽어 켤 때의 읽기 양을 줄입니다.
 * 테마의 상속(Inherits)은 따라가지 않습니다(docs/design/architecture.md §6).
 */
export function loadCursorTable(themeName) {
    const dir = findCursorDir(themeName);
    if (!dir)
        return new Map();

    const images = [];
    for (const {file, names} of groupLinks(dir).values()) {
        const isText = names.some(name => TEXT_CURSOR_NAMES.includes(name));
        try {
            images.push(...(isText ? readTextImages(file) : readImageHeaders(file)));
        } catch {
            // 읽지 못하는 파일은 표에서 뺍니다. 그 커서에서는 배지가 나오지 않을 뿐입니다.
        }
    }
    return buildTable(images);
}

function findCursorDir(themeName) {
    const bases = [
        GLib.build_filenamev([GLib.get_user_data_dir(), 'icons']),
        GLib.build_filenamev([GLib.get_home_dir(), '.icons']),
        ...GLib.get_system_data_dirs().map(dir => GLib.build_filenamev([dir, 'icons'])),
    ];
    for (const base of bases) {
        const dir = Gio.File.new_for_path(GLib.build_filenamev([base, themeName, 'cursors']));
        if (dir.query_file_type(Gio.FileQueryInfoFlags.NONE, null) === Gio.FileType.DIRECTORY)
            return dir;
    }
    return null;
}

// 별칭 링크(xterm, text → ibeam)를 따라가 실제 파일마다 이름을 모읍니다.
function groupLinks(dir) {
    const groups = new Map();
    const children = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    let info;
    while ((info = children.next_file(null)) !== null) {
        const name = info.get_name();
        const file = resolveLinks(dir.get_child(name));
        const path = file.get_path();
        if (!groups.has(path))
            groups.set(path, {file, names: []});
        groups.get(path).names.push(name);
    }
    children.close(null);
    return groups;
}

function resolveLinks(file) {
    for (let depth = 0; depth < 8; depth++) {
        const info = file.query_info('standard::is-symlink,standard::symlink-target',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        if (!info.get_is_symlink())
            return file;
        const target = info.get_symlink_target();
        file = GLib.path_is_absolute(target)
            ? Gio.File.new_for_path(target)
            : file.get_parent().resolve_relative_path(target);
    }
    return file;
}

function readTextImages(file) {
    const [, bytes] = file.load_contents(null);
    if (tocLength(bytes.subarray(0, 16)) === null)
        return [];
    return imagePositions(bytes).map(position => {
        const header = parseImageHeader(bytes.subarray(position, position + IMAGE_HEADER_SIZE));
        const chunk = bytes.subarray(position, position + IMAGE_HEADER_SIZE + header.width * header.height * 4);
        return {...header, isText: true, extents: imageExtents(chunk)};
    });
}

function readImageHeaders(file) {
    const stream = file.read(null);
    try {
        const length = tocLength(readAt(stream, 0, 16));
        if (length === null)
            return [];
        return imagePositions(readAt(stream, 0, length)).map(position =>
            ({...parseImageHeader(readAt(stream, position, IMAGE_HEADER_SIZE)), isText: false, extents: null}));
    } finally {
        stream.close(null);
    }
}

function readAt(stream, position, length) {
    stream.seek(position, GLib.SeekType.SET, null);
    return stream.read_bytes(length, null).toArray();
}
