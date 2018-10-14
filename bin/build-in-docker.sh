#!/usr/bin/env bash

BIN="$(cd "$(dirname "$0")" ; pwd)"
PROJECT="$(dirname "${BIN}")"

docker run -ti -v "${PROJECT}:${PROJECT}" -w "${PROJECT}" node:latest npm run build