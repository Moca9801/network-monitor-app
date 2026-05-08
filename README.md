# Network Monitor App (Uptime Monitor)

Una aplicación full-stack para el monitoreo de red en tiempo real mediante ICMP (Ping), construida con **Angular**, **Node.js**, **Socket.io** y **Tailwind CSS**.

## Características
- **Monitoreo ICMP**: Pings automáticos a los objetivos configurados por cada usuario.
- **Tiempo Real**: Actualizaciones instantáneas en el dashboard mediante WebSockets.
- **Gráficos de Latencia**: Visualización de historial de respuesta usando ECharts.
- **Persistencia ligera**: Usuarios y objetivos se guardan en archivos JSON locales; logs e historial se guardan en el navegador (`localStorage`).
- **Notificaciones**: Alertas por Telegram y webhook genérico.
- **Diseño Premium**: UI limpia y moderna con Tailwind CSS y modo oscuro.

## Estructura del Proyecto
```text
network-monitor-app/
├── backend/           # Node.js + Express + Socket.io + ICMP Monitor
└── frontend/          # Angular 19 + Tailwind CSS + ECharts
```

## Requisitos
- Node.js (v18+)
- npm

## Instalación y Ejecución

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
- La URL del backend para el frontend se define en `frontend/src/environments/environment.ts`.
- `backend/users.json` y `backend/targets.json` contienen datos locales de ejecución; no deberían versionarse con datos reales.

## Autor
- **Moca9801**
