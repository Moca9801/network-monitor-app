#!/bin/sh
set -eu

cat > /usr/share/nginx/html/app-config.json <<EOF
{
  "backendUrl": "${BACKEND_URL:-http://localhost:3000}",
  "demoMode": ${DEMO_MODE:-false}
}
EOF

exec nginx -g 'daemon off;'
