# GreenField — Smart Precision Farming

A responsive, role-aware precision-farming demo built with React, TypeScript and Vite. It uses stable seed data and browser localStorage; no backend, external API, IoT hardware, MQTT broker, or SMS service is connected.

## Requirements
- Node.js 18.18+ (Node.js 20 LTS recommended)
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite.

## Validate and build
```bash
npm run typecheck
npm run build
npm run preview
```

## Demo accounts
- Sumit Singh — Admin
- Pushkar Kandalgaonkar — Farmer
- Ramesh Patil — Farmer
- Priya Deshmukh — Partner
- Amit Jadhav — Technician

Choose an account on the login screen and click **Continue as demo**. No password is required. This is a client-side demonstration only and must not be used as production authentication.

## Demo functionality
- Role-aware navigation and data filtering.
- Persistent browser session and local demo data.
- Farms, crops, devices, alerts and user management.
- Alert acknowledgement/resolution, device maintenance notes and editable profile preferences.
- Sensor charts using deterministic sample data.
- Rule-based demo recommendations and reset-demo-data action.

## Not connected yet
- ESP32 or physical sensors
- MQTT/HTTPS ingestion
- Backend/API server or MySQL
- Real authentication/authorization
- Live weather, geolocation or SMS
- Production-grade audit trail

## GitHub
Create a repository, then from this folder:
```bash
git init
git add .
git commit -m "Build functional precision farming demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```
Do not commit `.env` files containing secrets. The current `.env.example` contains no secrets.
