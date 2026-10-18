// SPDX-License-Identifier: GPL-2.0-or-later
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class HangulCursorIndicatorExtension extends Extension {
    enable() {
        console.log(`${this.uuid}: enable`);
    }

    disable() {
        console.log(`${this.uuid}: disable`);
    }
}
