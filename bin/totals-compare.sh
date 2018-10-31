#!/usr/bin/env bash

BIN="$(cd "$(dirname "$0")" ; pwd)"

source "${BIN}/verbose.sh"

if [ -z "$1" ]
then
    error "Usage: $(basename "$0") <triodos-and-ing-file>"
fi

TRIODOS_AND_ING="$1"

(
    "${BIN}/totals-from-triodos-and-ing.sh" "${TRIODOS_AND_ING}" | sed -e 's/^/</'
    "${BIN}/totals-from-ledger.sh" | sed -e 's/^/>/'
) \
    | sort -k 1.2 \
    | uniq -u -s1