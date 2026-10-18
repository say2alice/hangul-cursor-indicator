# 한영 커서 표시기

GNOME Wayland에서 마우스 커서 옆에 한/영 입력 상태를 표시하는 GNOME Shell 확장입니다.

- 마우스 포인터가 텍스트 커서(I빔)일 때 포인터 오른쪽 아래에 배지를 표시합니다. 한글은 파란 원에 흰 `ㅎ`, 영문은 회색 원에 `A`입니다.
- 한/영을 바꾸면 텍스트 캐럿 오른쪽 아래에도 배지를 잠깐 표시합니다. 타이핑하는 동안 포인터를 숨기는 앱에서도 모드를 확인할 수 있습니다.
- 전체 화면 창이 있는 모니터에서는 배지를 숨깁니다.

## 설치

### 요구 환경

| 항목 | 조건 |
| --- | --- |
| 셸 | GNOME Shell 50, Wayland 세션 |
| 입력기 | IBus와 `ibus-hangul`. 입력 소스는 `hangul` 하나입니다 |
| 커서 테마 | 텍스트 커서 파일을 테마 안에 가진 테마. Yaru(Ubuntu 기본)에서 확인했습니다 |

동작을 확인한 환경은 Ubuntu 26.04.1 LTS, GNOME Shell 50.1, `ibus-hangul` 1.5.5입니다.

### 릴리스 패키지로 설치

1. [릴리스](https://gitlab.way2java.net/project/hangul-cursor-indicator/-/releases) 페이지에서 `hangul-cursor-indicator-<버전>.shell-extension.zip`을 내려받습니다.

2. 확장을 설치합니다. 출력은 없습니다.

```bash
gnome-extensions install hangul-cursor-indicator-<버전>.shell-extension.zip
```

3. 로그아웃했다가 다시 로그인합니다. Wayland 세션에서는 셸이 새로 설치한 확장을 로그인할 때 찾습니다.

4. 확장을 켭니다. "확장" 앱에서 켜도 됩니다.

```bash
gnome-extensions enable hangul-cursor-indicator@way2java.net
```

5. 켜졌는지 확인합니다. `State: ACTIVE`가 나오면 됩니다.

```bash
gnome-extensions info hangul-cursor-indicator@way2java.net
```

새 버전으로 바꿀 때는 2번 명령에 `--force`를 붙여 설치한 뒤 다시 로그인합니다.

### 소스에서 설치

릴리스가 없거나 개발 중인 코드를 쓰려면 저장소에서 패키지를 만들어 설치합니다. `gnome-extensions` 명령은 `gnome-shell` 패키지에 들어 있습니다.

```bash
git clone https://gitlab.way2java.net/project/hangul-cursor-indicator.git
```

```bash
cd hangul-cursor-indicator && scripts/pack.sh
```

마지막 줄에 `dist/hangul-cursor-indicator@way2java.net.shell-extension.zip`이 나오면, 그 파일로 위의 2번부터 진행합니다.

### 지우기

```bash
gnome-extensions uninstall hangul-cursor-indicator@way2java.net
```

### 알려진 제약

- 설정 화면이 없습니다. 위치, 색, 표시 시간은 고정입니다.
- `GTK_IM_MODULE=ibus`로 IBus의 GTK 모듈을 직접 쓰는 앱에서는 캐럿 옆 배지가 나오지 않습니다. 이 변수가 비어 있으면(GNOME 기본) 나옵니다.
- 세로쓰기 I빔에서는 배지가 나오지 않습니다. Yaru에서 다른 커서와 그림이 같아 구별하지 못합니다.
- 앱이 직접 그린 커서와, 테마가 다른 테마에서 상속받은 커서에서는 배지가 나오지 않습니다.
- X11 세션, IBus가 아닌 입력기(fcitx5, kime, nimf), GNOME Shell 49 이하는 지원하지 않습니다.

## 개발

설계, 요구사항, 진행 상황은 문서 저장소 [hangul-cursor-indicator-doc](https://gitlab.way2java.net/project/hangul-cursor-indicator-doc)의 `docs/`에 있습니다. 개발환경의 근거와 실측 결과는 `docs/design/development-environment.md`, 브랜치와 병합 요청 규칙은 `docs/guide/git-branch-strategy.md`입니다.

### 준비

GNOME Shell 50, `mutter-dev-bin`(중첩 셸), Node.js가 필요합니다. Node.js는 ESLint 10의 요건에 따라 20.19 이상의 20, 22.13 이상의 22, 24 이상 가운데 하나를 씁니다. 명령은 저장소 루트에서 실행합니다.

| 파일과 폴더 | 내용 |
| --- | --- |
| `src/` | 확장 소스. 사용자 확장 폴더에 연결하는 대상입니다 |
| `tests/` | 단위 테스트(`node --test`) |
| `scripts/` | 중첩 셸 실행, 중첩 셸 안 명령 실행, 패키지 만들기, 릴리스 등록 |
| `ci/` | 파이프라인이 쓰는 빌드 이미지 정의 |
| `dist/` | 패키지 결과 (추적 제외) |
| `local/` | 이 PC에만 두는 자료. 중첩 셸의 세션 버스 주소(`local/nested/bus`)도 여기에 적습니다 (추적 제외) |

처음 한 번 `src/`를 사용자 확장 폴더에 연결하고, 개발 의존성을 설치합니다. 릴리스 패키지로 설치한 확장이 있으면 먼저 지웁니다.

```bash
ln -s "$PWD/src" ~/.local/share/gnome-shell/extensions/hangul-cursor-indicator@way2java.net
```

```bash
npm install
```

### 중첩 셸에서 시험

로그아웃하지 않고 확장을 시험할 수 있습니다. 중첩 셸을 실행합니다. 창을 닫으면 끝납니다.

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

### 검사와 테스트

코드를 검사합니다. 오류가 없으면 `> eslint src tests` 줄 뒤에 아무것도 나오지 않습니다.

```bash
npm run lint
```

단위 테스트를 실행합니다. 마지막 요약에 `# fail 0`이 나오면 통과입니다.

```bash
npm test
```

패키지를 만듭니다. 마지막 줄에 `dist/hangul-cursor-indicator@way2java.net.shell-extension.zip`이 나오면 성공입니다.

```bash
scripts/pack.sh
```

### 파이프라인과 릴리스

`develop` 대상 병합 요청과 `develop`에서 파이프라인이 검사(`npm run lint`, `npm test`)를 실행하고, 통과해야 병합할 수 있습니다. `main`의 `v<버전>` 태그가 패키지를 만들어 GitLab 릴리스에 등록합니다. 버전은 `src/metadata.json`의 `version-name` 한 곳에 둡니다. 실행 조건과 릴리스 절차는 문서 저장소의 `docs/operations/release.md`에 있습니다.

## 라이선스

GNU GPL v2 이상(GPL-2.0-or-later)입니다. 전문은 [LICENSE](LICENSE)에 있습니다.
