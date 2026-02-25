# Network Monitor App (Uptime Monitor)

Una aplicación full-stack para el monitoreo de red en tiempo real mediante ICMP (Ping), construida con **Angular**, **Node.js**, **Socket.io** y **Tailwind CSS**.

## Características
- **Monitoreo ICMP**: Pings automáticos cada 60 segundos a una lista de IPs configuradas.
- **Tiempo Real**: Actualizaciones instantáneas en el dashboard mediante WebSockets.
- **Gráficos de Latencia**: Visualización de historial de respuesta usando ECharts.
- **Sin Base de Datos**: Backend 100% stateless. La persistencia de logs e historial se maneja en el navegador (`localStorage`).
- **Notificaciones**: Sistema de alertas configurado para webhooks (Mock en consola).
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
npm start
```

### 2. Frontend
```bash
cd frontend
npm install
npm start
```
Abre [http://localhost:4200](http://localhost:4200) para ver el dashboard.

## Configuración de IPs
Las IPs a monitorear se configuran en `backend/server.js` en la constante `IPS_TO_MONITOR`.

## Autor
- **Moca9801**
