// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const LABELS = {hangul: 'ㅎ', latin: 'A'};
// 글자의 세로 보정(px)입니다. 글꼴 상자 가운데에 두면 자모 ㅎ과 대문자 A가 처져 보여 올립니다(docs/design/badge-design.md §2).
const GLYPH_DY = {hangul: -1, latin: -1};

/**
 * 원형 외곽선 배지입니다(ADR-0003). 마우스 입력을 받지 않습니다(FR-PS-02).
 * 모양과 색은 stylesheet-light.css, stylesheet-dark.css에 있습니다.
 */
export class Badge {
    constructor() {
        this._mode = null;
        this._holdId = 0;
        this._label = new St.Label({style_class: 'hci-glyph'});
        // 글자 상자가 배지보다 클 수 있어(ㅎ 17px), 배지 안쪽에 줄이지 않고 글자 크기 그대로 가운데에 둡니다.
        this._actor = new St.Widget({
            style_class: 'hci-badge',
            layout_manager: new Clutter.FixedLayout(),
            reactive: false,
            can_focus: false,
            opacity: 0,
        });
        this._actor.add_child(this._label);
        // 셸이 종료될 때는 disable() 없이 위젯이 먼저 해제되므로, 그 뒤의 호출은 무시합니다(docs/design/architecture.md §5.1).
        this._actor.connect('destroy', () => {
            this._removeHoldTimer();
            this._actor = null;
        });
        this._actor.connect('notify::allocation', () => this._centerLabel());
        // 글자나 스타일이 바뀌면 글자 크기가 다음 배치 때 정해지므로, 그때 다시 가운데에 맞춥니다.
        this._label.connect('notify::allocation', () => this._centerLabel());
        // 모니터를 정확히 덮는 창은 직접 스캔아웃되어 배지가 화면에 나오지 않으므로,
        // 배지가 보이는 동안 직접 스캔아웃을 끕니다(ui/boxpointer.js와 같은 방식, docs/design/architecture.md §5.3).
        this._unredirectDisabled = false;
        this._actor.connectObject('notify::opacity', () => this._syncUnredirect(), this);
        // 전체 화면 창 위에서도 숨기지 않으므로(FR-VS-03) trackFullscreen을 쓰지 않습니다.
        Main.layoutManager.addTopChrome(this._actor);
    }

    // 스타일을 바꾼 직후에도 새 크기를 얻도록 할당된 크기 대신 원하는 크기를 씁니다.
    // 셸이 시작하는 중처럼 아직 화면에 올라가지 않았으면 `null`입니다.
    get size() {
        if (!this._actor?.get_stage())
            return null;
        const [, , width, height] = this._actor.get_preferred_size();
        return {width, height};
    }

    setMode(mode) {
        if (mode === this._mode || !this._actor)
            return;

        this._mode = mode;
        this._actor.remove_style_class_name('hci-hangul');
        this._actor.remove_style_class_name('hci-latin');
        if (mode) {
            this._actor.add_style_class_name(`hci-${mode}`);
            this._label.text = LABELS[mode];
        }
        this._centerLabel();
    }

    setShown(shown) {
        if (!this._actor)
            return;
        this._stopFlash();
        this._actor.opacity = shown ? 255 : 0;
    }

    /**
     * `holdMs` 동안 그대로 보인 뒤 `fadeMs` 동안 서서히 숨습니다(FR-VS-04, FR-VS-05).
     * 셸의 애니메이션 설정을 따르므로, 애니메이션을 끄면 바로 숨습니다.
     */
    flash(holdMs, fadeMs) {
        if (!this._actor)
            return;
        this.setShown(true);
        this._holdId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, holdMs, () => {
            this._holdId = 0;
            this._actor.ease({
                opacity: 0,
                duration: fadeMs,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
            return GLib.SOURCE_REMOVE;
        });
    }

    moveTo(x, y) {
        this._actor?.set_position(Math.round(x), Math.round(y));
    }

    destroy() {
        this._removeHoldTimer();
        if (!this._actor)
            return;
        this._actor.remove_all_transitions();
        this._actor.disconnectObject(this);
        if (this._unredirectDisabled) {
            global.compositor.enable_unredirect();
            this._unredirectDisabled = false;
        }
        Main.layoutManager.removeChrome(this._actor);
        this._actor.destroy();
    }

    _centerLabel() {
        // 끌 때 화면에서 빠지는 중이거나 아직 배치되기 전에는 맞출 크기가 없습니다.
        if (!this._actor?.get_stage() || !this._actor.has_allocation())
            return;
        const content = this._actor.get_theme_node().get_content_box(this._actor.get_allocation_box());
        const [, , width, height] = this._label.get_preferred_size();
        const x = Math.round(content.x1 + (content.get_width() - width) / 2);
        const y = Math.round(content.y1 + (content.get_height() - height) / 2 + (GLYPH_DY[this._mode] ?? 0));
        if (this._label.x !== x || this._label.y !== y)
            this._label.set_position(x, y);
    }

    // 셸은 끄고 켠 횟수를 세므로, 상태가 바뀔 때만 한 번씩 부릅니다.
    _syncUnredirect() {
        if (!this._actor)
            return;
        const shown = this._actor.opacity > 0;
        if (shown === this._unredirectDisabled)
            return;
        this._unredirectDisabled = shown;
        if (shown)
            global.compositor.disable_unredirect();
        else
            global.compositor.enable_unredirect();
    }

    // 기다리는 타이머와 진행 중인 사라짐 애니메이션을 멈춥니다.
    _stopFlash() {
        this._removeHoldTimer();
        this._actor.remove_all_transitions();
    }

    _removeHoldTimer() {
        if (this._holdId) {
            GLib.source_remove(this._holdId);
            this._holdId = 0;
        }
    }
}
