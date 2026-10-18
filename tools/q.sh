#!/bin/bash
# q.sh 'js expression' [timeout seconds] — run JS in the a3_repl session and print the result
D=/tmp/a3repl; rm -f $D/out.txt; printf '%s' "$1" > $D/cmd.tmp; mv $D/cmd.tmp $D/cmd.js
T=${2:-300}; for ((i=0;i<T*4;i++)); do [ -f $D/out.txt ] && { cat $D/out.txt; exit 0; }; sleep 0.25; done; echo TIMEOUT
