#!/bin/sh
set -eu
node --import tsx server/db/migrate.ts
exec node dist-server/server.js
