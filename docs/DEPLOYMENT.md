# Deployment

This guide covers safe self-hosted deployments. For public demos, use demo mode and avoid monitoring private infrastructure.

## Local Docker

```bash
copy .env.example .env
docker compose up --build
```

Open `http://localhost:8080`.

## Production Compose

Create a `.env` file with strong secrets:

```env
JWT_SECRET=replace-with-a-long-random-secret
SECRETS_ENCRYPTION_KEY=replace-with-another-long-random-secret
CORS_ORIGIN=https://monitor.example.com
FRONTEND_BACKEND_URL=https://api.example.com
ALLOW_PRIVATE_TARGETS=false
MAX_TARGETS_PER_USER=100
```

Then run:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## Public Demo Mode

Demo mode seeds a read-only demo user and sample public targets.

```env
DEMO_MODE=true
DEMO_USERNAME=demo
DEMO_PASSWORD=demo-password
ALLOW_PRIVATE_TARGETS=false
```

The frontend shows a demo login button when `DEMO_MODE=true` is passed to the frontend container.

## Reverse Proxy Notes

Use HTTPS in front of both frontend and backend. The browser must be able to reach the backend URL configured in `FRONTEND_BACKEND_URL`.

Recommended headers and proxy behavior:

- Preserve WebSocket upgrades for Socket.io.
- Set `CORS_ORIGIN` to the frontend origin.
- Keep backend `/health` reachable from the platform or load balancer.

## Health Check

Backend:

```bash
curl http://localhost:3000/health
```

Response includes uptime, demo mode, active users and target counts.
