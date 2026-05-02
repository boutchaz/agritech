#!/bin/sh
set -e
# Single-variable substitution so nginx tokens like $uri / $request_uri are preserved.
export CANONICAL_PUBLIC_HOST="${CANONICAL_PUBLIC_HOST:-localhost}"
envsubst '$CANONICAL_PUBLIC_HOST' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
