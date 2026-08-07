# Contribuir

- Backend: TypeScript estricto, un servicio por recurso (`services/`), controladores delgados (`controllers/`), validación de entrada con Zod (`utils/validators.ts`).
- Frontend: pantallas en `app/` (Expo Router file-based), lógica compartida en `hooks/` y `stores/`, componentes de presentación en `components/`.
- Antes de un PR: `npm test` en `backend/` y `frontend/` — CI (`.github/workflows/ci.yml`) lo repite automáticamente en cada push/PR a `main`.
- Los tests de `backend/` corren contra el proyecto de Supabase de desarrollo (no hay base de datos de test separada); necesitan las mismas variables de `backend/.env`. Cada test crea y borra su propia cuenta desechable — nunca deben tocar la cuenta real del usuario.
- Cambios de esquema van en `backend/migrations/`, numerados, y se ejecutan a mano desde el SQL Editor de Supabase — el código que dependa de una columna/tabla nueva no funcionará (ni en local ni en CI) hasta que la migración correspondiente se haya aplicado.
