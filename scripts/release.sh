#!/bin/sh
# 태그 파이프라인의 release 잡이 실행합니다. 태그를 검사하고 패키지를 올린 뒤 GitLab 릴리스를 만듭니다.
# 검사 기준과 실패 시 대응은 문서 저장소의 docs/operations/release.md §3.3, §5에 있습니다.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)

version=$(jq -r '."version-name" // empty' "$root/src/metadata.json")
if [ "$CI_COMMIT_TAG" != "v$version" ]; then
    echo "태그 $CI_COMMIT_TAG 가 version-name($version)과 다릅니다." >&2
    exit 1
fi

git -C "$root" fetch --quiet origin main
if ! git -C "$root" merge-base --is-ancestor "$CI_COMMIT_SHA" FETCH_HEAD; then
    echo "태그 커밋 $CI_COMMIT_SHA 가 main에 없습니다." >&2
    exit 1
fi

file="hangul-cursor-indicator-$version.shell-extension.zip"
url="$CI_API_V4_URL/projects/$CI_PROJECT_ID/packages/generic/hangul-cursor-indicator/$version/$file"
curl --silent --show-error --fail-with-body --header "JOB-TOKEN: $CI_JOB_TOKEN" \
    --upload-file "$root/dist/hangul-cursor-indicator@way2java.net.shell-extension.zip" "$url"
echo

jq -n --arg tag "$CI_COMMIT_TAG" --arg description "${CI_COMMIT_TAG_MESSAGE:-$CI_COMMIT_TAG}" \
    --arg name "$file" --arg url "$url" \
    '{name: $tag, tag_name: $tag, description: $description,
      assets: {links: [{name: $name, url: $url, link_type: "package"}]}}' |
    curl --silent --show-error --fail-with-body --header "JOB-TOKEN: $CI_JOB_TOKEN" \
        --header "Content-Type: application/json" --data @- \
        "$CI_API_V4_URL/projects/$CI_PROJECT_ID/releases"
echo
