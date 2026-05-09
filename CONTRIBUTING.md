# Contributing

Thanks for taking the time to improve Network Monitor App.

This project is designed for self-hosted network monitoring. Please keep safety in mind: do not add real IP inventories, credentials, Telegram tokens, chat IDs, `.env` files, or local JSON data to commits.

## Development Setup

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs at `http://localhost:4200` and the backend defaults to `http://localhost:3000`.

## Quality Checks

Run these before opening a pull request:

```bash
cd backend
npm test
```

```bash
cd frontend
npm test
npm run build
```

## Pull Request Guidelines

- Keep pull requests focused and small enough to review.
- Include tests when changing validation, auth, monitoring, storage, or UI behavior.
- Update documentation when adding environment variables, deployment steps, or public APIs.
- Avoid unrelated formatting churn.
- Do not commit generated local data from `backend/users.json` or `backend/targets.json`.

## Security Guidelines

- Never include secrets, real targets, internal hostnames, screenshots with private data, or production logs.
- For public demos, keep `ALLOW_PRIVATE_TARGETS=false`.
- Report vulnerabilities through the process described in `SECURITY.md`.
