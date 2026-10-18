// SPDX-License-Identifier: GPL-2.0-or-later
import * as Signals from 'resource:///org/gnome/shell/misc/signals.js';
import {getInputSourceManager} from 'resource:///org/gnome/shell/ui/status/keyboard.js';

// ibus-hangul이 InputMode 속성에 내보내는 기호입니다(docs/design/development-environment.md §6).
const SYMBOL_TO_MODE = new Map([['한', 'hangul'], ['EN', 'latin']]);

/**
 * IBus 입력 모드가 바뀌면 `changed`를 보냅니다(FR-ST-01, FR-ST-02).
 * `mode`는 `'hangul'`, `'latin'`, 알 수 없으면 `null`입니다.
 */
export class InputMonitor extends Signals.EventEmitter {
    constructor() {
        super();
        this.mode = null;
        this._sources = getInputSourceManager();
        this._sources.connectObject('current-source-changed', () => this._updateMode(), this);
        this._updateMode();
    }

    destroy() {
        this._sources.disconnectObject(this);
    }

    _updateMode() {
        const mode = readMode(this._sources.currentSource);
        if (mode === this.mode)
            return;
        this.mode = mode;
        this.emit('changed');
    }
}

function readMode(source) {
    if (source?.type !== 'ibus' || !source.properties)
        return null;

    let prop;
    for (let i = 0; (prop = source.properties.get(i)) != null; i++) {
        if (prop.get_key() === 'InputMode')
            return SYMBOL_TO_MODE.get(prop.get_symbol()?.get_text()) ?? null;
    }
    return null;
}
