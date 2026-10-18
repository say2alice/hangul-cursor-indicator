# 한영 커서 표시기

GNOME Wayland에서 마우스 커서 옆에 한/영 입력 상태를 표시하는 GNOME Shell 확장입니다.

## 개발

GNOME Shell 50, `mutter-dev-bin`(중첩 셸), Node.js(ESLint)가 필요합니다. 명령은 저장소 루트에서 실행합니다. 개발환경의 근거와 실측 결과는 문서 저장소의 `docs/design/development-environment.md`에 있습니다.

| 파일과 폴더 | 내용 |
| --- | --- |
| `src/` | 확장 소스. 사용자 확장 폴더에 연결하는 대상입니다 |
| `scripts/` | 중첩 셸 실행, 중첩 셸 안 명령 실행, 패키지 만들기 |
| `dist/` | 패키지 결과 (추적 제외) |
| `local/` | 이 PC에만 두는 자료. 중첩 셸의 세션 버스 주소(`local/nested/bus`)도 여기에 적습니다 (추적 제외) |

처음 한 번 `src/`를 사용자 확장 폴더에 연결하고, ESLint를 설치합니다.

```bash
ln -s "$PWD/src" ~/.local/share/gnome-shell/extensions/hangul-cursor-indicator@way2java.net
```

```bash
npm install
```

중첩 셸을 실행합니다. 창을 닫으면 끝납니다.

```bash
scripts/nested-shell.sh
```

다른 터미널에서 중첩 셸 안의 확장을 켭니다. 켜진 확장 목록은 실제 세션과 공유되므로, 시험을 마치면 `enable` 대신 `disable`로 끈 뒤 창을 닫습니다.

```bash
scripts/nested-run.sh gnome-extensions enable hangul-cursor-indicator@way2java.net
```

중첩 셸 안에 시험할 애플리케이션을 실행합니다.

```bash
scripts/nested-run.sh gnome-text-editor --standalone
```

코드를 검사합니다. 오류가 없으면 `> eslint src` 줄 뒤에 아무것도 나오지 않습니다.

```bash
npm run lint
```

패키지를 만듭니다. 마지막 줄에 `dist/hangul-cursor-indicator@way2java.net.shell-extension.zip`이 나오면 성공입니다.

```bash
scripts/pack.sh
```

## 라이선스

GNU GPL v2 이상(GPL-2.0-or-later)입니다. 전문은 [LICENSE](LICENSE)에 있습니다.
