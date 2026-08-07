# Arquitectura

- **Backend**: Express + TypeScript, sin ORM — acceso a datos vía `@supabase/supabase-js` (cliente admin con service key para operaciones de servidor).
- **Auth**: Supabase Auth para gestión de usuarios; JWT propios (`config/auth.ts`) para access/refresh tokens de la API.
- **Frontend**: Expo Router (file-based routing) + React Query para estado de servidor + Zustand para estado de cliente (auth, workout en curso).
- **Base de datos**: PostgreSQL vía Supabase. Ver `backend/migrations/` para el esquema y `008_create_views.sql` para la vista de estadísticas por ejercicio.

## Flujo de un entrenamiento

1. `POST /workouts` crea la sesión (`workoutService.start`).
2. Cada set se registra con `POST /sets` mientras el usuario entrena — si no es warmup, también aplica daño a la batalla de ese ejercicio (`battleService.applyDamage`).
3. `PUT /workouts/:id/complete` cierra la sesión: recalcula duración, otorga XP al personaje si existe (`characterService.awardXpForWorkout`) y remata cualquier batalla del entrenamiento (`battleService.finishForWorkout`) — es idempotente, no se puede completar dos veces.
4. El cron diario (`generateDailyReport`) agrega los sets del día en `workout_stats`.

## Capa RPG (opcional, no bloquea el tracker)

- **Personaje** (`characters`, `characterService.ts`): el usuario elige una clase predefinida (`config/characterTypes.ts`: powerlifter, bodybuilder, crossfitter, calisthenics, fracasado). Nivel y XP se derivan siempre de datos reales (`computeWorkoutXp` = volumen + nº de series + PRs), nunca se introducen a mano. Al crear el personaje se hace un backfill de XP con todo el historial previo del usuario.
- **Combate** (`exercise_battles`, `battleService.ts`): cada ejercicio de un entrenamiento es un "enemigo" con HP. Cada serie (no warmup) le hace daño proporcional al volumen respecto al histórico del usuario en ese ejercicio. La garantía real de "siempre se derrota al enemigo" no depende de que el HP llegue a 0 por daño — `finishForWorkout` fuerza `hp_current=0, defeated=true` en cualquier batalla no resuelta al completar el entrenamiento. `defeated` es un trinquete de una sola dirección (nunca se revierte), así que borrar una serie después no puede resucitar un enemigo ya derrotado.
- **Bestiario** (`GET /battles/bestiary`): agregación de todas las batallas derrotadas por ejercicio — cuántas veces, cuándo fue la última.

## Papelera (soft-delete)

`exercises` y `routines` tienen una columna `deleted_at`. Borrar desde la API la marca en vez de eliminar la fila — así las series, huecos en rutinas y batallas que la referencian sobreviven intactos. `GET /:resource/trash`, `POST /:id/restore` y `DELETE /:id/permanent` (solo alcanzable desde la papelera) completan el ciclo. En `exercises` el índice único `UNIQUE(user_id, name)` se sustituyó por uno parcial (`WHERE deleted_at IS NULL`) para que un nombre en la papelera no bloquee crear uno nuevo igual.

## Tests

`backend/tests/integration/` son tests de integración reales contra el proyecto de Supabase de desarrollo — no hay base de datos de test separada ni mocks del cliente de Supabase. Cada test crea y borra su propia cuenta desechable (`tests/helpers/testUser.ts`), así que solo toca datos que él mismo generó. `frontend/` tiene tests unitarios de lógica pura (`utils/`, `stores/`) y de hooks/componentes con mocks de `services/api`. CI (`.github/workflows/ci.yml`) corre ambas suites en cada push/PR a `main`; el job de backend necesita las credenciales de Supabase como secrets del repo.
