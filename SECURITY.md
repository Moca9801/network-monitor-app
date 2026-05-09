# Security Policy

## Supported Use

Network Monitor App is intended for self-hosted monitoring of networks and hosts that you own or are authorized to monitor.

Do not publish real `users.json`, `targets.json`, `.env` files, private IP inventories, Telegram bot tokens, chat IDs, JWT secrets, or deployment credentials.

## Reporting a Vulnerability

If you find a vulnerability, please open a private security advisory on GitHub or contact the maintainer directly before publishing details.

Please include:

- A clear description of the issue.
- Steps to reproduce.
- Affected commit or version.
- Any suggested mitigation.

## Operational Notes

- Rotate any token or secret that has ever been committed, shared, or logged.
- Use strong values for `JWT_SECRET` and `SECRETS_ENCRYPTION_KEY`.
- Restrict `CORS_ORIGIN` to the deployed frontend origin.
- Avoid exposing an unrestricted public instance that can ping arbitrary hosts.
- Use demo data only for public showcases.
