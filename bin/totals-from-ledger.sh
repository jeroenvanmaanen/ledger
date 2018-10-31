#!/usr/bin/env bash

SED_EXT=-r
case "$(uname)" in
Darwin*)
        SED_EXT=-E
esac
export SED_EXT

TAB="$(echo -en '\011')"

ADD_UP='true'
if [ ".$1" = '.--raw' ]
then
    ADD_UP='false'
fi

function add-up() {
    if "${ADD_UP}"
    then
        awk '
BEGIN {
}
{
    key = $1 "-" $2 "-" $3
    if (key != "--") {
        ## print key " : " $4;
        totals[key] = totals[key] + $4;
    }
}
END {
    for (key in totals) {
        print key, totals[key]
    }
}'
    else
        cat
    fi
}

curl -sS http://localhost:8888/api/transactions?sort=date \
    | line-breaks-json.sh \
    | tr '}\012' '\012\011' \
    | sed "${SED_EXT}" \
        -e "s/[{,]${TAB}/${TAB}/g" \
        -e "s/^${TAB}*//" \
        -e "/^${TAB}[]]${TAB}\$/d" \
        -e 's/^/|/' \
        -e "s/^(.*)(${TAB}\"cents\":)([^${TAB}]*)(${TAB})/\\3\\1\\2\\3\\4/" \
        -e "s/^(.*)(${TAB}\"debetCredit\":)([^${TAB}]*)(${TAB})/\\3 \\1\\2\\3\\4/" \
        -e "s/^(.*)(${TAB}\"account\":)([^${TAB}]*)(${TAB})/\\3 \\1\\2\\3\\4/" \
        -e "s/^(.*)(${TAB}\"date\":)([^${TAB}]*)(${TAB})/\\3 \\1\\2\\3\\4/" \
        -e 's/[|].*//' \
        -e 's/[-"]//g' \
    | add-up \
    | sort