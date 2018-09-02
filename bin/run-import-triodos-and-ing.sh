#!/bin/bash

SED_EXT=-r
case $(uname) in
Darwin*)
	SED_EXT=-E
esac
export SED_EXT

BIN="$(cd "$(dirname "$0")" ; pwd)"

declare -a FLAGS_INHERIT
source "${BIN}/verbose.sh"

FILE="$1"
if [ -z "${FILE}" ]
then
    error "Usage: $(basename "$0") [ -v [ -v ] ] <import-file>"
fi

DATA="$(cd "$(dirname "${FILE}")" ; pwd)"

function is-prefix() {
    local P="$1"
    local S="$2"
    local PATTERN="$(echo "${P}" | sed "${SED_EXT}" -e 's/([\\.?+*{}()|^$]|[[]|[]])/\\\1/g')"
    log "PATTERN=[${PATTERN}]"
    echo "${S}" | egrep -q "^${PATTERN}"
}

declare -a VOLUMES
if is-prefix "${DATA}" "${BIN}"
then
    VOLUMES=(-v "${DATA}:${DATA}")
elif is-prefix "${BIN}" "${DATA}"
then
    VOLUMES=(-v "${BIN}:${BIN}")
else
    VOLUMES=(-v "${DATA}:${DATA}" -v "${BIN}:${BIN}")
fi

set -x
docker run "${VOLUMES[@]}" --link ledger_rest --rm tutum/curl /bin/bash -c "'${BIN}/import-triodos-and-ing.sh' ${FLAGS_INHERIT[@]} '${FILE}'"
