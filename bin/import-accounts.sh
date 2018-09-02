#!/bin/bash

set -e

SED_EXT=-r
case $(uname) in
Darwin*)
	SED_EXT=-E
esac
export SED_EXT

BIN="$(cd "$(dirname "$0")" ; pwd)"
PROJECT="$(dirname "${BIN}")"
DATA="${PROJECT}/data"

. "${BIN}/verbose.sh"

sed -e 's/^---$/|/' "${DATA}/accounts-local.json" \
    | tr '|\012' '\012 ' \
    | while read LINE
        do
            log "LINE=[${LINE}]"
            ACCOUNT="$(echo "${LINE}" | sed "${SED_EXT}" -n -e 's/^.*"account": "([^"]*)".*$/\1/p')"
            log "ACCOUNT=[${ACCOUNT}]"
            if [ -n "${ACCOUNT}" ]
            then
                RESULT="$(curl -sS "http://localhost:8888/api/accounts/?account=\"${ACCOUNT}\"" || true)"
                if [ ".${RESULT}" != ".[]" ]
                then
                    log "REMOVE: [${RESULT}]"
                    echo "${RESULT}" | sed -e 's/},{/|/g' | tr '|' '\012' \
                        | sed "${SED_EXT}" -n -e 's/^.*"id":"([^"]*)".*$/\1/p' \
                        | while read ID
                            do
                                log "ID=[${ID}]"
                                if [ -n "${ID}" ]
                                then
                                    curl -sS -X DELETE "http://localhost:8888/api/accounts/${ID}" || true
                                fi
                            done
                fi
                curl -sS -X POST -H 'Content-Type: application/json' -d "${LINE}" "http://localhost:8888/api/accounts/" | sed
            fi
        done