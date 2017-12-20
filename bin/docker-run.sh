#!/bin/bash

set -e

NAME='ledger'
PORT='8888'

docker rm -r mongodb-ledger
MONGO_VOLUME="data-${NAME}"
MONGO_CONTAINER="mongodb-${NAME}"
docker run \
    -d \
    --mount "type=volume,src=${MONGO_VOLUME},dst=/data/db" \
    -p 27017:27017 \
    -p 28017:28017 \
    --name "${MONGO_CONTAINER}" \
    mongo \
    mongod --rest --httpinterface

mongo-rest-server.sh -v -v -d ledger mongodb-ledger
docker run \
    -d \
    -p 3000:3000 \
    --link "${MONGO_CONTAINER}:mongodb" \
    -e ME_CONFIG_DBSTRING="mongodb://mongodb:27017/${DATABASE}" \
    --name "${REST_CONTAINER}" \
    jeroenvm/mongo-rest

docker rm -f nginx-ledger
NGINX_CONTAINER="nginx-${NAME}"
WEB_ROOT_DIR="${PROJECT}/build"
WEB_ROOT_DIR="${PROJECT}/etc"
docker run \
    -d \
    --mount "type=bind,src=${WEB_ROOT_DIR},dst=/usr/share/nginx/html" \
    --mount "type=bind,src=${CONFIG_DIR},dst=/etc/nginx" \
    -p "${PORT}:80" \
    --link mongodb-ledger-rest \
    --name "${NGINX_CONTAINER}" \
    nginx
nginx-server.sh -v -v -n ledger -d ~/src/ledger -- --link mongodb-ledger-rest
