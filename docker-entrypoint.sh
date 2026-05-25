#!/bin/sh
set -e

mkdir -p /data/uploads

if [ -f /app/public/uploads/placeholder.svg ] && [ ! -f /data/uploads/placeholder.svg ]; then
  cp /app/public/uploads/placeholder.svg /data/uploads/placeholder.svg
fi

rm -rf /app/public/uploads
ln -sfn /data/uploads /app/public/uploads

# One-shot wipe of seeded demo patients. Marker prevents re-running.
if [ -f /data/bcos.db ] && [ ! -f /data/.wiped-seed ]; then
  node -e "const db=require('better-sqlite3')('/data/bcos.db'); db.pragma('foreign_keys=ON'); db.exec('DELETE FROM treatments; DELETE FROM consents; DELETE FROM visits; DELETE FROM patients;');"
  touch /data/.wiped-seed
fi

exec "$@"
