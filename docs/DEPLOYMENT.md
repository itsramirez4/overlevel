# Deployment

## Backend (Railway)

1. Conecta el repo a Railway y selecciona `backend/` como root.
2. Configura las variables de entorno de `backend/.env.example` en el panel de Railway.
3. Build command: `npm run build`. Start command: `npm start`.

## Frontend (Expo/EAS)

1. `cd frontend && eas build --platform android` (o `--platform ios`).
2. Configura `EXPO_PUBLIC_API_URL` apuntando a la URL pública del backend en Railway antes de compilar.
3. Usa `eas submit` para publicar en las stores una vez validado el build.

## Base de datos

Las migraciones en `backend/migrations/` se ejecutan manualmente desde el SQL Editor de Supabase, en orden numérico.
