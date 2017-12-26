#!/bin/bash

set -e

BIN="$(cd "$(dirname "$0")" ; pwd)"
PROJECT="$(dirname "${BIN}")"

. "${BIN}/verbose.sh"

function usage() {
    echo "Usage: $(basename "$0") [ -h ] [ -d <mongo-data-volume-name> ] [ -p <mongo-port> | -P ]" >&2
}

if [ ".$1" = '.-h' ]
then
    usage
    exit 0
fi

NAME='ledger'
PORT='8888'

MONGO_VOLUME="${NAME}_data"
if [ ".$1" = '.-d' ]
then
    MONGO_VOLUME="$2"
    shift
    shift
fi

if [ ".$1" = '.-p' ]
then
    MONGO_PORT="$2"
    shift
    shift
elif [ ".$1" = '.-P' ]
then
    MONGO_PORT='27017'
    shift
fi

declare -a EXPOSE_ARGS
if [ -n "${MONGO_PORT}" ]
then
    EXPOSE_ARGS=(-p "27017:${MONGO_PORT}")
else
    EXPOSE_ARGS=(--expose '27017')
fi

MONGO_CONTAINER="${NAME}_mongodb"
docker rm -f "${MONGO_CONTAINER}" || true
docker run \
    -d \
    --mount "type=volume,src=${MONGO_VOLUME},dst=/data/db" \
    "${EXPOSE_ARGS[@]}" \
    --name "${MONGO_CONTAINER}" \
    mongo \
    mongod --rest --httpinterface

REST_CONTAINER="${NAME}_rest"
DATABASE='ledger'
docker rm -f "${REST_CONTAINER}" || true
docker run \
    -d \
    --expose 3000 \
    --link "${MONGO_CONTAINER}:mongodb" \
    -e ME_CONFIG_DBSTRING="mongodb://mongodb:27017/${DATABASE}" \
    --name "${REST_CONTAINER}" \
    jeroenvm/mongo-rest

NGINX_CONTAINER="${NAME}_nginx"
docker rm -f "${NGINX_CONTAINER}" || true
WEB_ROOT_DIR="${PROJECT}/build"
CONFIG_DIR="${PROJECT}/etc"
docker run \
    -d \
    --mount "type=bind,src=${WEB_ROOT_DIR},dst=/usr/share/nginx/html" \
    --mount "type=bind,src=${CONFIG_DIR},dst=/etc/nginx" \
    -p "${PORT}:80" \
    --link "${REST_CONTAINER}:mongodb-ledger-rest" \
    --name "${NGINX_CONTAINER}" \
    nginx
