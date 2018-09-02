#!/bin/bash

set -e

BIN="$(cd "$(dirname "$0")" ; pwd)"
PROJECT="$(dirname "${BIN}")"

. "${BIN}/verbose.sh"

function usage() {
    echo "Usage: $(basename "$0") [ -h ]" >&2
}

if [ ".$1" = '.-h' ]
then
    usage
    exit 0
fi

NAME='ledger'

MONGO_CONTAINER="${NAME}_mongodb"
docker rm -f "${MONGO_CONTAINER}" || true

REST_CONTAINER="${NAME}_rest"
docker rm -f "${REST_CONTAINER}" || true

NGINX_CONTAINER="${NAME}_nginx"
docker rm -f "${NGINX_CONTAINER}" || true
