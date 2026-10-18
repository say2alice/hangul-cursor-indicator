# 확장 빌드 이미지입니다. 구성과 태그 규칙은 문서 저장소의 docs/operations/build-env/extension-build-image.md에 있습니다.
FROM ubuntu:resolute-20261006

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        gnome-shell nodejs npm git curl jq ca-certificates \
    && rm -rf /var/lib/apt/lists/*
