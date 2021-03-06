#!/bin/bash

set -e

SED_EXT=-r
case $(uname) in
Darwin*)
    SED_EXT=-E
esac
export SED_EXT

BIN="$(cd "$(dirname "$0")" ; pwd)"

. "${BIN}/verbose.sh"

DRY_RUN='false'
if [ ".$1" = '.--dry-run' ]
then
    DRY_RUN='true'
    log 'Dry run'
    shift
fi

LEDGER_REST='localhost:8888'
if [ ".$1" = '.-r' ]
then
    LEDGER_REST="$2"
    shift 2
fi

function usage() {
  echo "Usage: $(basename "$0") <data-file>"
  exit 1
}

FILE="$1"
if [ -z "${FILE}" ]
then
    usage
fi

TAB="$(echo -en '\011')"
MARK="$(echo -en '\001')"

PREV_DAY=''

function pad-record() {
    local RECORD="$1"
    local COUNT="$2"
    while [ "$(echo "${RECORD}${TAB}" | tr -dc '\011' | wc -c)" -lt "${COUNT}" ]
    do
        RECORD="${RECORD}${TAB}"
    done
    echo "${RECORD}"
}

function format-record() {
    local LINE="$1"
    trace "LINE=[${LINE}]"
    echo "${LINE}" \
        | sed "${SED_EXT}" \
            -e 's/^([0-9]{4})/\1-/' \
            -e 's/^([0-9]{4}-[0-9]{2})/"month": "\1", "date": "\1-/' \
            -e "s/^([^,]*), /\1,${MARK} /" \
            -e "s/^/{${MARK} /" \
            -e "s/${TAB}/\",${MARK} \"name\": \"/" \
            -e "s/${TAB}/\",${MARK} \"account\": \"/" \
            -e "s/${TAB}/\",${MARK} \"contraAccount\": \"/" \
            -e "s/${TAB}/\",${MARK} \"code\": \"/" \
            -e "s/${TAB}/\",${MARK} \"debetCredit\": \"/" \
            -e "s/^([^${TAB}]*${TAB})(([0-9]*)[.])?([0-9]*),([0-9]{2}${TAB})/\\1\\3\\4\\5/" \
            -e "s/^([^${TAB}]*${TAB})0([0-9]{2}${TAB})/\\1\\2/" \
            -e "s/^([^${TAB}]*${TAB})0([0-9]${TAB})/\\1\\2/" \
            -e "s/(${MARK} \"debetCredit\": \"([^${TAB}]*)${TAB}([^${TAB}]*)${TAB})/\\1\\2 \\3${TAB}/" \
            -e "s/${TAB}/\",${MARK} \"cents\": /" \
            -e "s/^([^${TAB}]*${TAB})(Af|Deb[ie]t) /\\1-/" \
            -e "s/^([^${TAB}]*${TAB})[^${TAB}]* /\\1/" \
            -e "s/${TAB}/,${MARK} \"signedCents\": /" \
            -e "s/${TAB}/,${MARK} \"kind\": \"/" \
            -e "s/${TAB}/\",${MARK} \"remarks\": \"/" \
            -e "s/${TAB}/\",${MARK} \"number\": /" \
            -e "s/^(.*)(${MARK} \"date\": \")([^\",]*)(\",.*${MARK} \"number\": )(.*)$/\1\2\3\4\5,${MARK} \"key\": \"\3_\5\"/" \
            -e "s/\$/${MARK}}/" \
        | tr "${MARK}" '\012'
}

function insert-record() {
    local DATE="$(echo "$1" | cut -d "${TAB}" -f 1 | sed "${SED_EXT}" -e 's/^([0-9]{4})/\1-/' -e 's/^([0-9]{4}-[0-9]{2})/\1-/')"
    log "DATE=[${DATE}]"
    if [ "${DATE}" != "${PREV_DAY}" ]
    then
        NUM=1
    else
        NUM=$[$NUM+1]
    fi
    local RECORD="$(pad-record "$1" 9)"
    local JSON="$(format-record "${RECORD}${TAB}${NUM}")"
    if "${DRY_RUN}"
    then
        log "JSON=[${JSON}]"
    else
        trace "JSON=[${JSON}]"
    fi

    if [ "x${DATE}" '>' "x${LAST_DAY}" ] || [ "x${DATE}" = "x${PREV_DAY}" ] || [ -z "${LAST_DAY}" ]
    then
        log "COMPARE: x${DATE} > x${LAST_DAY} | ${LAST_DAY}"
        if [ "${DATE}" != "${PREV_DAY}" ]
        then
            if [ -z "${FIRST_DAY}" ]
            then
                FIRST_DAY="${DATE}"
            fi
            LAST_DAY="${DATE}"
            STATE="{ \"firstDay\": \"${FIRST_DAY}\", \"lastDay\": \"${LAST_DAY}\" }"
            log "STATE=[${STATE}]"
            "${DRY_RUN}" || curl -sS -d "${STATE}" -X PUT -H 'Content-Type: application/json' -H 'Accept: application/json' "http://${LEDGER_REST}/api/state/feedbeef"
            echo
        fi

        "${DRY_RUN}" || curl -sS -d "${JSON}" -X POST -H 'Content-Type: application/json' -H 'Accept: application/json' "http://${LEDGER_REST}/api/transactions"
        echo
    else
        log "SKIP: [${DATE}]"
    fi

    PREV_DAY="${DATE}"
}

STATE="$(curl -sS -H 'Accept: application/json' "http://${LEDGER_REST}/api/state")"
FIRST_DAY=''
LAST_DAY=''
if [ ".${STATE}" != '.[]' ]
then
    STATE="$(echo "${STATE}" | sed -e '1s/^\s*[[]\s*//' -e '$s/\s*[]]\s*$//')"
    log "STATE=[${STATE}]"
    FIRST_DAY="$(echo "${STATE}" | sed -n "${SED_EXT}" -e 's/^.*"firstDay"\s*:"([^"]*)".*/\1/p')"
    LAST_DAY="$(echo "${STATE}" | sed -n "${SED_EXT}" -e 's/^.*"lastDay"\s*:"([^"]*)".*/\1/p')"
fi
log "FIRST_DAY=[${FIRST_DAY}]"
log "LAST_DAY=[${LAST_DAY}]"

sed -e '1d' -e 's/"/\\"/g' "${FILE}" \
    | tr -d '\015' \
    | while read LINE
        do
            insert-record "${LINE}"
        done
