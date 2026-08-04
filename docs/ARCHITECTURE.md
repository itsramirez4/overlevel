# Arquitectura

- **Backend**: Express + TypeScript, sin ORM — acceso a datos vía `@supabase/supabase-js` (cliente admin con service key para operaciones de servidor).
- **Auth**: Supabase Auth para gestión de usuarios; JWT propios (`config/auth.ts`) para access/refresh tokens de la API.
- **Frontend**: Expo Router (file-based routing) + React Query para estado de servidor + Zustand para estado de cliente (auth, workout en curso).
- **Base de datos**: PostgreSQL vía Supabase. Ver `backend/migrations/` para el esquema y `008_create_views.sql` para la vista de estadísticas por ejercicio.

## Flujo de un entrenamiento

1. `POST /workouts` crea la sesión (`workoutService.start`).
2. Cada set se registra con `POST /sets` mientras el usuario entrena.
3. `PUT /workouts/:id/complete` cierra la sesión.
4. El cron diario (`generateDailyReport`) agrega los sets del día en `workout_stats`.
