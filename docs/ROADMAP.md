# Roadmap

This roadmap keeps the project useful as a self-hosted open source tool while leaving database persistence for the final stage.

## Current Focus

- Improve tests around authentication, Socket.io events and monitoring behavior.
- Add safer demo defaults and clearer deployment examples.
- Improve contributor experience with CI, issue templates and architecture docs.

## Next Milestones

### 1. Test Coverage

- Backend integration tests for auth routes.
- Socket.io tests for target creation, site management and notification events.
- Frontend component tests for dashboard flows.

### 2. Operational Readiness

- Structured backend logs.
- Health endpoint for deployments.
- Better error states in the UI when the backend is unreachable.

### 3. Public Demo Mode

- Optional mock targets.
- Read-only demo user.
- Safer defaults for public instances.

### 4. Persistence Upgrade

Planned last, after the public repository foundation is stable:

- SQLite for simple single-host deployments.
- Postgres for multi-user production deployments.
- Migration path from existing JSON files.
