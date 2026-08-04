# API

Base URL: `http://localhost:3001/api`. Todas las rutas salvo `/auth/login` requieren `Authorization: Bearer <access_token>`.

No hay registro público: los usuarios se crean manualmente en Supabase Auth (dashboard → Authentication → Users). El primer login de cada usuario crea automáticamente su fila en la tabla `users`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Verifica credenciales contra Supabase Auth, devuelve tokens + perfil (crea el perfil si es el primer login) |
| GET | `/users/me` | Perfil del usuario autenticado |
| PUT | `/users/me` | Actualiza perfil |
| GET/POST | `/exercises` | Lista / crea ejercicios del usuario |
| GET/PUT/DELETE | `/exercises/:id` | Detalle / edición / borrado |
| GET/POST | `/routines` | Lista / crea rutinas |
| GET/PUT/DELETE | `/routines/:id` | Detalle / edición / borrado |
| POST | `/routines/:id/exercises` | Añade ejercicio a una rutina |
| GET | `/workouts` | Últimos entrenamientos (con sets) |
| POST | `/workouts` | Inicia un entrenamiento |
| PUT | `/workouts/:id/complete` | Marca un entrenamiento como completado |
| GET | `/sets/workout/:workoutId` | Sets de un entrenamiento |
| POST | `/sets` | Registra un set |
| GET | `/analytics/summary` | Resumen del mes (volumen, nº entrenamientos) |
| GET | `/analytics/exercise/:id` | Estadísticas de un ejercicio (1RM estimado, etc.) |
