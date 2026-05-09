# Troubleshooting

## Frontend Cannot Connect to Backend

Check that the backend is running and that the frontend points to the right URL.

Local development:

```bash
cd backend
npm run dev
```

Runtime frontend config:

```json
{
  "backendUrl": "http://localhost:3000"
}
```

In Docker, set `FRONTEND_BACKEND_URL` to the public backend URL that the browser can reach.

## CORS Errors

Set `CORS_ORIGIN` to the frontend origin.

Examples:

```env
CORS_ORIGIN=http://localhost:4200
```

```env
CORS_ORIGIN=https://monitor.example.com
```

Multiple origins can be comma-separated.

## Login Works but Socket Disconnects

This usually means the stored token is missing, expired, or signed with a different `JWT_SECRET`.

Try:

- Clear browser local storage.
- Restart backend with the same `JWT_SECRET`.
- Log in again.

## Ping Does Not Work in Docker

ICMP requires extra container permissions. The Compose file includes `NET_RAW`; if you run the backend container manually, include equivalent permissions.

```bash
docker run --cap-add=NET_RAW ...
```

Some hosting providers block ICMP entirely. In that case, the app can run but ping checks will fail.

## Private IPs Are Rejected

For public demos this is expected when:

```env
ALLOW_PRIVATE_TARGETS=false
```

For a trusted private deployment, set:

```env
ALLOW_PRIVATE_TARGETS=true
```

Only monitor networks and hosts you own or are authorized to test.

## Telegram Test Fails

Check:

- The bot token is valid.
- The chat ID is correct.
- The bot has permission to send messages to that chat.
- The backend has outbound HTTPS access to `api.telegram.org`.

## Data Disappears After Restart

With local development, data is stored under `backend/` unless `DATA_DIR` is configured. With Docker Compose, data is stored in the `backend-data` volume.

Do not commit `backend/users.json` or `backend/targets.json`.

## Dependency Audit Warnings

Run:

```bash
cd backend
npm audit
```

Review the output before applying automatic fixes. Some fixes may update transitive packages or change behavior.
