# Hangul Cursor Indicator

English | [한국어](README.ko.md)

A GNOME Shell extension that shows the Korean/English input mode next to the mouse pointer on GNOME Wayland.

> This project is developed on [GitLab](https://gitlab.way2java.net/jangb/hangul-cursor-indicator). The GitHub repository is a read-only mirror. Releases and issues are on GitLab.

- When the mouse pointer is a text cursor (I-beam), a badge appears at the lower right of the pointer as you move it. Hangul mode shows a white `ㅎ` on a blue circle, and English mode shows an `A` in a gray outlined circle.
- When you stop the pointer, the badge fades out over 0.3 seconds after 0.7 seconds, and it appears again as soon as you move the pointer. While the pointer is still, switching the input mode does not bring back the pointer badge.
- When you switch the input mode, a badge appears briefly at the lower right of the text caret. You can check the mode even when the pointer is still, or in apps that hide the pointer while you type.

![Badge appearance](images/badge.svg)

The left half is the light theme and the right half is the dark theme. Each half shows, in order, the Hangul badge next to the I-beam, the English badge next to the I-beam, and the Hangul badge next to the caret at the end of a line of text. The sizes and gaps of the badges and the I-beam match the real values, and the I-beam is a simplified drawing of the Yaru I-beam.

## Installation

### Requirements

| Item | Requirement |
| --- | --- |
| Shell | GNOME Shell 50, Wayland session |
| Input method | IBus with `ibus-hangul`. The only input source is `hangul` |
| Cursor theme | A theme that contains its own text cursor file. Tested with Yaru (the Ubuntu default) |

Tested on Ubuntu 26.04.1 LTS, GNOME Shell 50.1, and `ibus-hangul` 1.5.5.

### Install from a release

1. Download `hangul-cursor-indicator-<version>.shell-extension.zip` from the [Releases](https://gitlab.way2java.net/jangb/hangul-cursor-indicator/-/releases) page on GitLab.

2. Install the extension. The command prints nothing. Installing alone does not show the badge; it appears only after steps 3 and 4. If you install the same file again, you get `exists and --force was not specified`, which means the extension is already installed.

```bash
gnome-extensions install hangul-cursor-indicator-<version>.shell-extension.zip
```

3. **Log out and log back in.** In a Wayland session, GNOME Shell finds newly installed extensions only at login. Until you log in again, the command in step 5 reports `doesn't exist` and no badge appears.

4. Enable the extension. You can also enable it in the Extensions app.

```bash
gnome-extensions enable hangul-cursor-indicator@way2java.net
```

5. Check that the extension is enabled. You should see `State: ACTIVE`.

```bash
gnome-extensions info hangul-cursor-indicator@way2java.net
```

To upgrade to a new version, add `--force` to the command in step 2, and then log in again.

### Install from source

To use unreleased code, build the package from the repository and install it. The `gnome-extensions` command is in the `gnome-shell` package.

```bash
git clone https://gitlab.way2java.net/jangb/hangul-cursor-indicator.git
```

```bash
cd hangul-cursor-indicator && scripts/pack.sh
```

When the last line shows `dist/hangul-cursor-indicator@way2java.net.shell-extension.zip`, continue from step 2 above with that file.

### Uninstall

```bash
gnome-extensions uninstall hangul-cursor-indicator@way2java.net
```

### Known limitations

- There is no settings dialog. The position, colors, and display times are fixed.
- In apps that use the IBus GTK module directly with `GTK_IM_MODULE=ibus`, the caret badge does not appear. It appears when this variable is empty (the GNOME default).
- The badge does not appear for the vertical-text I-beam. In Yaru it has the same image as another cursor, so the extension cannot tell them apart.
- The badge does not appear for cursors that an app draws itself, or for cursors that a theme inherits from another theme.
- X11 sessions, input methods other than IBus (fcitx5, kime, nimf), and GNOME Shell 49 or earlier are not supported.

## Development

The design, requirements, and progress are documented in Korean in the documentation repository [hangul-cursor-indicator-doc](https://gitlab.way2java.net/jangb/hangul-cursor-indicator-doc). Setting up the development environment, testing in a nested shell, and the pipeline and release process are described in the [Development](README.ko.md#개발) section of the Korean README.

Development requires GNOME Shell 50, `mutter-dev-bin` (for the nested shell), and Node.js 20.19 or later 20.x, 22.13 or later 22.x, or 24 or later. Run the following commands from the repository root.

```bash
npm install
```

```bash
npm run lint
```

```bash
npm test
```

```bash
scripts/pack.sh
```

## License

GNU GPL v2 or later (GPL-2.0-or-later). See [LICENSE](LICENSE) for the full text.
