// SPDX-License-Identifier: GPL-2.0-or-later
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PointerWatcher from 'resource:///org/gnome/shell/ui/pointerWatcher.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {Badge} from './badge.js';
import {CaretTracker} from './caretTracker.js';
import {findTextCursor, gapFor} from './cursorShape.js';
import {loadCursorTable} from './cursorTheme.js';
import {InputMonitor} from './inputMonitor.js';
import {DEFAULT_GAP, placeBadge, placeNearCaret} from './placement.js';

// 돋보기(ui/magnifier.js)와 같은 조회 간격입니다. 근거는 docs/design/architecture.md §3에 있습니다.
const POINTER_INTERVAL_MS = 1000 / 60;
// FR-VS-04에서 정한, 캐럿 옆 배지가 그대로 보이는 시간과 서서히 사라지는 시간입니다.
const CARET_HOLD_MS = 300;
const CARET_FADE_MS = 200;
// FR-VS-05에서 정한, 포인터가 멈춘 뒤 포인터 옆 배지가 그대로 보이는 시간과 서서히 사라지는 시간입니다.
const POINTER_HOLD_MS = 700;
const POINTER_FADE_MS = 300;

export default class HangulCursorIndicatorExtension extends Extension {
    enable() {
        this._onTextCursor = false;
        this._lastMoveUs = 0;
        this._gap = DEFAULT_GAP;
        this._badge = new Badge();
        this._caretBadge = new Badge();
        this._caret = new CaretTracker();
        this._input = new InputMonitor();
        this._mode = this._input.mode;
        this._badge.setMode(this._mode);
        this._input.connectObject('changed', () => this._onModeChanged(), this);

        this._interface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._interface.connectObject('changed::cursor-theme', () => this._loadCursorTable(), this);
        this._cursorTracker = global.backend.get_cursor_tracker();
        this._cursorTracker.connectObject('cursor-changed', () => this._updateCursor(), this);
        this._loadCursorTable();

        this._pointerWatch = PointerWatcher.getPointerWatcher().addWatch(
            POINTER_INTERVAL_MS, (x, y) => this._onPointerMoved(x, y));
    }

    // 만든 것을 모두 해제합니다(NFR-LC-01).
    disable() {
        this._pointerWatch.remove();
        this._pointerWatch = null;
        this._cursorTracker.disconnectObject(this);
        this._cursorTracker = null;
        this._interface.disconnectObject(this);
        this._interface = null;
        this._cursorTable = null;
        this._input.disconnectObject(this);
        this._input.destroy();
        this._input = null;
        this._caret.destroy();
        this._caret = null;
        this._caretBadge.destroy();
        this._caretBadge = null;
        this._badge.destroy();
        this._badge = null;
    }

    // 모드가 바뀌면 캐럿 옆에 배지를 잠시 보입니다(FR-VS-04). 포인터 옆 배지는 글자만 바꿉니다(FR-VS-05).
    _onModeChanged() {
        const previous = this._mode;
        this._mode = this._input.mode;
        this._badge.setMode(this._mode);
        if (this._mode === null)
            this._badge.setShown(false);
        if (!previous || !this._mode || !this._caret.rect)
            return;

        const caret = this._caret.rect;
        const monitor = Main.layoutManager.findMonitorForPoint(caret.x, caret.y);
        this._caretBadge.setMode(this._mode);
        const size = this._caretBadge.size;
        if (!monitor || !size)
            return;
        const position = placeNearCaret(caret, size, monitor);
        this._caretBadge.moveTo(position.x, position.y);
        this._caretBadge.flash(CARET_HOLD_MS, CARET_FADE_MS);
    }

    _loadCursorTable() {
        const theme = this._interface.get_string('cursor-theme');
        this._cursorTable = loadCursorTable(theme);
        if (![...this._cursorTable.values()].some(entry => entry.isText))
            console.warn(`${this.uuid}: 커서 테마 ${theme}에서 텍스트 커서를 찾지 못해 배지를 표시하지 않습니다`);
        this._updateCursor();
    }

    // 지금 커서가 텍스트 커서인지 가리고, 그 그림에 맞춘 간격을 정합니다(FR-VS-02, ADR-0004).
    _updateCursor() {
        const sprite = this._cursorTracker.get_sprite();
        const [xhot, yhot] = this._cursorTracker.get_hot();
        const entry = sprite
            ? findTextCursor(this._cursorTable, {width: sprite.get_width(), height: sprite.get_height(), xhot, yhot})
            : null;
        const wasOnText = this._onTextCursor;
        this._onTextCursor = entry !== null;
        if (entry)
            this._gap = gapFor(entry, Meta.prefs_get_cursor_size());
        this._placeAtPointer();
        if (!this._onTextCursor)
            this._badge.setShown(false);
        // 앱은 포인터가 들어온 뒤에 커서를 정하므로, 움직인 직후에 텍스트 커서로 바뀐 것은 움직임으로 봅니다(docs/design/architecture.md §5.3).
        else if (!wasOnText && this._movedRecently())
            this._showPointerBadge();
    }

    _onPointerMoved(x, y) {
        this._lastMoveUs = GLib.get_monotonic_time();
        this._place(x, y);
        this._showPointerBadge();
    }

    _movedRecently() {
        return GLib.get_monotonic_time() - this._lastMoveUs < POINTER_HOLD_MS * 1000;
    }

    // 표시 조건(FR-VS-02)을 만족하면 잠시 보인 뒤 서서히 숨기고(FR-VS-05), 아니면 바로 숨깁니다.
    _showPointerBadge() {
        if (this._onTextCursor && this._mode !== null)
            this._badge.flash(POINTER_HOLD_MS, POINTER_FADE_MS);
        else
            this._badge.setShown(false);
    }

    _placeAtPointer() {
        const [x, y] = global.get_pointer();
        this._place(x, y);
    }

    _place(x, y) {
        const monitor = Main.layoutManager.findMonitorForPoint(x, y);
        const size = this._badge.size;
        if (!monitor || !size)
            return;
        const position = placeBadge({x, y}, size, monitor, this._gap);
        this._badge.moveTo(position.x, position.y);
    }
}
