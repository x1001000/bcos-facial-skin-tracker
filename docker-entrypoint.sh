#!/bin/sh
set -e

mkdir -p /data/uploads

if [ -f /app/public/uploads/placeholder.svg ] && [ ! -f /data/uploads/placeholder.svg ]; then
  cp /app/public/uploads/placeholder.svg /data/uploads/placeholder.svg
fi

rm -rf /app/public/uploads
ln -sfn /data/uploads /app/public/uploads

exec "$@"
