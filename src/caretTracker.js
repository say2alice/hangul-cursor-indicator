// SPDX-License-Identifier: GPL-2.0-or-later
import Mtk from 'gi://Mtk';

import {getIBusManager} from 'resource:///org/gnome/shell/misc/ibusManager.js';

/**
 * IBus가 알려 준 마지막 텍스트 캐럿 위치를 화면 좌표로 기억합니다(FR-VS-04).
 * 모르면 `rect`가 `null`입니다. 입력 포커스가 빠지면 지웁니다.
 */
export class CaretTracker {
    constructor() {
        this.rect = null;
        getIBusManager().connectObject(
            'set-cursor-location', (_manager, location) => this._update(location),
            'focus-out', () => (this.rect = null),
            this);
    }

    destroy() {
        getIBusManager().disconnectObject(this);
    }

    // 좌표 변환은 셸의 후보 창(ui/ibusCandidatePopup.js)과 같습니다. 셸에 키 포커스가 없으면 창 좌표입니다.
    _update({x, y, width, height}) {
        if (width === 0 && height === 0) {
            this.rect = null;
            return;
        }
        let rect = new Mtk.Rectangle({x, y, width, height});
        const focusWindow = global.display.focus_window;
        if (!global.stage.key_focus && focusWindow)
            rect = focusWindow.protocol_to_stage_rect(rect);
        this.rect = {x: rect.x, y: rect.y, width: rect.width, height: rect.height};
    }
}
