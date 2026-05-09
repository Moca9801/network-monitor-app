# Architecture

Network Monitor App is a self-hosted full-stack application for ICMP monitoring with a real-time web dashboard.

## High-Level Flow

```text
Angular frontend
  |
  | REST: register/login
  | Socket.io: targets, sites, ping results, alerts
  v
Node.js backend
  |
  | Reads/writes local JSON data
  | Runs ICMP checks
  | Sends Telegram notifications
  v
Monitored hosts
```

## Frontend

The frontend is an Angular standalone application.

- `src/app/services/auth.service.ts`: handles register/login and stores the JWT locally.
- `src/app/services/socket.service.ts`: owns the Socket.io connection and exposes typed RxJS streams.
- `src/app/services/app-config.service.ts`: loads `/app-config.json` at runtime so Docker/demo deployments can change the backend URL without rebuilding.
- `src/app/services/storage.service.ts`: stores browser-side logs and latency history in `localStorage`.
- `src/app/components/dashboard/`: dashboard UI, target management, site management, Telegram settings, custom dialogs.
- `src/app/models/monitoring.models.ts`: shared frontend interfaces.

## Backend

The backend is an Express + Socket.io service.

- `server.js`: REST auth endpoints, Socket.io authentication, target/site events, rate limits and validation wiring.
- `auth.js`: user registration/login, JWT handling, user settings and encrypted Telegram credentials.
- `monitor.js`: target persistence, ping loop, status changes, stats and Telegram delivery.
- `validation.js`: Zod schemas and host/IP validation.
- `config.js`: environment-driven secrets, CORS, safety limits and deployment options.

## Persistence

Current persistence is intentionally lightweight:

- `backend/users.json`: users, hashed passwords, encrypted Telegram settings and sites.
- `backend/targets.json`: monitored targets per user.
- Browser `localStorage`: local logs and latency history.

This is acceptable for a public self-hosted MVP. For production multi-user deployments, the planned next step is SQLite or Postgres.

## Real-Time Model

1. The user logs in through REST and receives a JWT.
2. The frontend opens a Socket.io connection using that JWT.
3. The backend joins the socket to a user-specific room.
4. Target updates and ping results are emitted only to that user's room.
5. The monitoring loop checks active users' targets and emits live status updates.

## Security Boundaries

- JWTs protect Socket.io events and API access.
- Telegram settings are encrypted before being stored.
- CORS is environment-controlled.
- Zod validates user input and target payloads.
- Rate limiting protects auth routes and high-frequency socket actions.
- `ALLOW_PRIVATE_TARGETS=false` should be used for public demos to reduce abuse risk.
