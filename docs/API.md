# API

Base URL: `http://localhost:3001/api`. Todas las rutas salvo `/auth/login` requieren `Authorization: Bearer <access_token>`.

No hay registro público: los usuarios se crean manualmente en Supabase Auth (dashboard → Authentication → Users). El primer login de cada usuario crea automáticamente su fila en la tabla `users`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Verifica credenciales contra Supabase Auth, devuelve tokens + perfil (crea el perfil si es el primer login) |
| POST | `/auth/refresh` | Renueva el par de tokens; rechaza si la cuenta ya no existe |
| GET | `/users/me` | Perfil del usuario autenticado |
| PUT | `/users/me` | Actualiza perfil |
| PUT | `/users/me/password` | Cambia contraseña (rate limit estricto) |
| GET | `/users/me/export` | Exporta todos los datos del usuario, incluida la papelera |
| POST | `/users/me/import/hevy` | Importa un CSV exportado de Hevy |
| GET/POST | `/exercises` | Lista (activos) / crea ejercicios del usuario |
| GET/PUT/DELETE | `/exercises/:id` | Detalle / edición / borrado (mueve a la papelera) |
| GET | `/exercises/trash` | Ejercicios borrados, pendientes de restaurar o eliminar para siempre |
| POST | `/exercises/:id/restore` | Restaura un ejercicio de la papelera |
| DELETE | `/exercises/:id/permanent` | Borra definitivamente — solo si ya está en la papelera |
| GET/POST | `/routines` | Lista (activas) / crea rutinas |
| GET/PUT/DELETE | `/routines/:id` | Detalle / edición / borrado (mueve a la papelera) |
| GET | `/routines/trash` | Rutinas borradas |
| POST | `/routines/:id/restore` | Restaura una rutina de la papelera |
| DELETE | `/routines/:id/permanent` | Borra definitivamente — solo si ya está en la papelera |
| POST | `/routines/:id/exercises` | Añade ejercicio a una rutina (orden calculado en servidor) |
| PUT | `/routines/:id/exercises/reorder` | Reordena los ejercicios de una rutina |
| GET | `/workouts` | Últimos entrenamientos (con sets) |
| POST | `/workouts` | Inicia un entrenamiento |
| PUT | `/workouts/:id/complete` | Marca un entrenamiento como completado (idempotente; otorga XP y remata batallas si aplica) |
| GET | `/sets/workout/:workoutId` | Sets de un entrenamiento |
| POST | `/sets` | Registra un set (aplica daño de batalla si no es warmup) |
| GET | `/analytics/summary` | Resumen del mes (volumen, nº entrenamientos, racha, rutina recomendada) |
| GET | `/analytics/volume-history` | Volumen semanal (`?weeks=`) |
| GET | `/analytics/muscle-distribution` | Volumen por grupo muscular (`?weeks=`) |
| GET | `/analytics/heatmap` | Volumen diario para el mapa de calor (`?weeks=`) |
| GET | `/analytics/records` | Récords personales actuales por ejercicio |
| GET | `/analytics/trained-exercises` | Ejercicios con al menos una serie registrada |
| GET | `/analytics/exercise/:id` | Estadísticas de un ejercicio (1RM estimado, etc.) |
| GET | `/analytics/exercise/:id/progress` | Progreso por sesión (mejor serie de cada una) |
| GET | `/characters/types` | Clases de personaje disponibles |
| GET | `/characters/me` | Personaje del usuario (`null` si no tiene) |
| POST | `/characters` | Crea personaje — hace backfill de XP con el historial existente |
| PUT | `/characters/me` | Cambia de clase (nivel/XP no se tocan) |
| GET | `/battles/workout/:workoutId` | Batallas (una por ejercicio) de un entrenamiento |
| GET | `/battles/bestiary` | Enemigos derrotados alguna vez, con nº de veces y última fecha |
