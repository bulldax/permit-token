#!/usr/bin/env bash
set -e

PORT=8545

export ETH_RPC_URL=http://127.1:$PORT

npx ganache-cli -p $PORT > ganache-log 2>&1 & netpid=$!

until curl -s -o/dev/null "$ETH_RPC_URL"; do
  sleep 1
  if [ -z "$(ps -p $netpid -o pid=)" ]; then
    echo "Ganache stopped running. Check ganache-log for errors."
    exit 1
  fi
done

# Stop the testnet when this script exits
trap "kill $netpid" EXIT

$@

