# Overlevel

Gym tracker mobile app. Backend en Express + TypeScript + Supabase, frontend en React Native (Expo Router).

## Estructura

- `backend/` — API REST (Express, Supabase, JWT)
- `frontend/` — App móvil (Expo, React Query, Zustand)
- `docs/` — Documentación de arquitectura, API y deployment

## Setup

### 1. Supabase

Crea un proyecto en https://supabase.com y ejecuta las migraciones de `backend/migrations/` en orden (001 a 009) desde el SQL Editor.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # completa SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, JWT_SECRET
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # apunta EXPO_PUBLIC_API_URL al backend
npm start
```

## Scripts

| Comando | Backend | Frontend |
|---|---|---|
| Dev | `npm run dev` | `npm start` |
| Test | `npm test` | `npm test` |
| Build | `npm run build` | `npm run build:android` / `build:ios` |
