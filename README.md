# Network Monitor App

[![CI](https://github.com/Moca9801/network-monitor-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Moca9801/network-monitor-app/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933)
![Angular](https://img.shields.io/badge/Angular-19-DD0031)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED)

Una aplicación full-stack para el monitoreo de red en tiempo real mediante ICMP (Ping), construida con **Angular**, **Node.js**, **Socket.io** y **Tailwind CSS**.

> Proyecto pensado para despliegues propios. Si publicas una demo, usa datos ficticios y no monitorees infraestructura real sin autorización.

## Estado Del Proyecto

Network Monitor App está en etapa **MVP/beta open source**: es útil para self-hosting, portfolio técnico y pruebas controladas. Para producción multiusuario de mayor escala, la migración a SQLite/Postgres queda como siguiente gran etapa.

## Demo / Capturas

Si publicas una demo, usa hosts ficticios o públicos de prueba y deja `ALLOW_PRIVATE_TARGETS=false`.

Las capturas recomendadas para el repo son:

- Dashboard principal con objetivos ficticios.
- Modal de creación/edición de objetivo.
- Vista de login/onboarding.
- Configuración de Telegram con datos redactados.

## Características
- **Monitoreo ICMP**: Pings automáticos a los objetivos configurados por cada usuario.
- **Tiempo Real**: Actualizaciones instantáneas en el dashboard mediante WebSockets.
- **Gráficos de Latencia**: Visualización de historial de respuesta usando ECharts.
- **Persistencia ligera**: Usuarios y objetivos se guardan en archivos JSON locales; logs e historial se guardan en el navegador (`localStorage`).
- **Notificaciones**: Alertas por Telegram y webhook genérico.
- **Diseño Premium**: UI limpia y moderna con Tailwind CSS y modo oscuro.
- **Sedes personalizables**: Cada usuario puede organizar sus propios grupos/sedes.
- **Configuración runtime**: El frontend puede cambiar la URL del backend sin recompilar.

## Estructura del Proyecto
```text
network-monitor-app/
├── backend/           # Node.js + Express + Socket.io + ICMP monitor
├── frontend/          # Angular 19 + Tailwind CSS + ECharts
├── docs/              # Arquitectura, troubleshooting y roadmap
└── .github/           # CI, templates de issues y PRs
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](CHANGELOG.md)
- [Contribuir](CONTRIBUTING.md)
- [Política de seguridad](SECURITY.md)

## Requisitos
- Node.js (v18+)
- npm
- Docker y Docker Compose (opcional)

## Inicio Rápido Con Docker

```bash
docker compose up --build
```

Luego abre [http://localhost:8080](http://localhost:8080).

Antes de usarlo fuera de pruebas locales, crea variables fuertes:

```bash
JWT_SECRET=replace-with-a-long-random-secret
SECRETS_ENCRYPTION_KEY=replace-with-another-long-random-secret
CORS_ORIGIN=https://tu-dominio.com
ALLOW_PRIVATE_TARGETS=false
MAX_TARGETS_PER_USER=100
FRONTEND_BACKEND_URL=https://api.tu-dominio.com
DEMO_MODE=false
```

## Instalación Manual

### 1. Backend
```bash
cd backend
npm install
copy .env.example .env
npm start
```

En producción configura valores fuertes para:

```env
JWT_SECRET=change-this-to-a-long-random-secret
SECRETS_ENCRYPTION_KEY=change-this-to-another-long-random-secret
CORS_ORIGIN=https://tu-dominio.com
ALLOW_PRIVATE_TARGETS=true
MAX_TARGETS_PER_USER=100
DEMO_MODE=false
```

### 2. Frontend
```bash
cd frontend
npm install
npm start
```
Abre [http://localhost:4200](http://localhost:4200) para ver el dashboard.

## Configuración

- Los objetivos a monitorear se agregan desde el dashboard y se persisten en `backend/targets.json`.
- Las credenciales de Telegram se configuran desde la UI o mediante variables de entorno del backend.
- La URL del backend para el frontend usa `frontend/public/app-config.json` en runtime y `frontend/src/environments/environment.ts` como fallback de desarrollo.
- En Docker puedes configurar esa URL con `FRONTEND_BACKEND_URL`.
- El modo demo se activa con `DEMO_MODE=true`; crea datos de muestra y bloquea acciones de escritura.
- `backend/users.json` y `backend/targets.json` contienen datos locales de ejecución; no deberían versionarse con datos reales.
- En Docker, los datos del backend se guardan en el volumen `backend-data`.

## Scripts De Calidad

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

CI ejecuta estas validaciones automáticamente en pull requests hacia `main`.

## Seguridad

- No subas `.env`, `backend/users.json`, `backend/targets.json`, tokens de Telegram, Chat IDs, inventarios de IPs privadas ni secretos JWT.
- Rota cualquier secreto que haya estado expuesto antes de publicar el repositorio.
- Limita `CORS_ORIGIN` al dominio real del frontend.
- En demos públicas deja `ALLOW_PRIVATE_TARGETS=false` para evitar ping a redes privadas/reservadas y ajusta `MAX_TARGETS_PER_USER`.
- Evita ofrecer una instancia pública que permita a usuarios no confiables monitorear cualquier host.
- Para una demo pública, usa datos mock o hosts públicos de prueba y desactiva credenciales reales.
- El endpoint `GET /health` expone métricas operativas básicas para healthchecks.

Consulta [SECURITY.md](SECURITY.md) para más detalles.

## Publicación Como Open Source

Este repositorio está preparado para uso self-hosted. Quienes lo clonen deben configurar sus propias variables de entorno y desplegarlo en su infraestructura.

Para una demo pública, se recomienda mantenerla separada del entorno real y no persistir datos sensibles.

Antes de publicar una release:

- Verifica que CI esté en verde.
- Revisa `npm audit` y documenta cualquier riesgo aceptado.
- Usa capturas con datos ficticios.
- Confirma que `ALLOW_PRIVATE_TARGETS=false` en demos públicas.
- Rota cualquier secreto que haya estado en un entorno de pruebas compartido.

## Licencia

MIT. Consulta [LICENSE](LICENSE).

## Autor
- **Moca9801**
