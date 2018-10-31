#!/usr/bin/env bash


SED_EXT=-r
case "$(uname)" in
Darwin*)
        SED_EXT=-E
esac
export SED_EXT

TAB="$(echo -en '\011')"

tail +2 "$@" \
    | awk -F "${TAB}" '
BEGIN {
}
{
    date = $1
    gsub(/-/, "", date);
    key = date "-" $3 "-" $6
    ## print key
    if (key != "--") {
        amount = $7;
        gsub(/[,.]/, "", amount);
        ## print key " : " amount;
        totals[key] = totals[key] + amount;
    }
}
END {
    for (key in totals) {
        print key, totals[key]
    }
}' \
    | sort