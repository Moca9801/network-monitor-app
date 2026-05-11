# Changelog

All notable changes to this project will be documented in this file.

The project follows semantic versioning once formal releases begin.

## Unreleased

### Added

- GitHub Actions CI for backend tests, frontend tests, frontend build and Docker build.
- Runtime frontend config through `app-config.json`.
- Zod validation, rate limiting and anti-abuse controls for monitored targets.
- Demo mode with read-only sample data.
- Backend `/health` endpoint with basic operational metrics.
- Docker healthchecks and production Compose example.
- Open source docs: contributing, architecture, troubleshooting, deployment and roadmap.
- GitHub issue and pull request templates.

### Changed

- Frontend services and dashboard use stronger TypeScript models.
- Native browser alerts were replaced with custom application dialogs.

### Security

- Telegram secrets are encrypted before storage.
- Public demos can block private/reserved targets with `ALLOW_PRIVATE_TARGETS=false`.
