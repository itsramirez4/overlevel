/** Served as plain HTML at GET /privacy — its own file so index.ts doesn't
 * carry a wall of markup. Update the "Última actualización" date whenever
 * the actual data practices described here change. */
export const PRIVACY_POLICY_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Política de privacidad — Overlevel</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 4rem; line-height: 1.6; color: #1a1a1a; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; }
  .updated { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
  ul { padding-left: 1.25rem; }
  a { color: #FF5A4A; }
</style>
</head>
<body>
<h1>Política de privacidad de Overlevel</h1>
<p class="updated">Última actualización: 5 de septiembre de 2026</p>

<p>Overlevel es una app de seguimiento de entrenamientos. Esta página explica qué datos recogemos, para qué los usamos y con quién los compartimos.</p>

<h2>Qué datos recogemos</h2>
<ul>
  <li><strong>Cuenta:</strong> email y nombre de usuario.</li>
  <li><strong>Perfil:</strong> nombre, biografía y si tu perfil es público o privado (opcionales).</li>
  <li><strong>Entrenamientos:</strong> ejercicios, series, repeticiones, peso, duración/distancia (cardio), rutinas y notas que registras.</li>
  <li><strong>Peso corporal:</strong> si decides registrarlo.</li>
  <li><strong>Actividad social:</strong> a quién sigues y quién te sigue, visible según tu configuración de privacidad.</li>
  <li><strong>Notificaciones push:</strong> un identificador de dispositivo (token), solo si das permiso, para avisarte de nuevos seguidores y de un resumen semanal.</li>
  <li><strong>Informes de errores técnicos:</strong> si la app falla, se envía un mensaje de error técnico (sin datos personales del formulario que estuvieras rellenando) para poder solucionarlo.</li>
</ul>

<h2>Para qué los usamos</h2>
<p>Únicamente para que la app funcione: guardar y mostrar tu progreso, calcular estadísticas, gestionar el aspecto social si lo activas, enviarte notificaciones que hayas permitido, y diagnosticar fallos. No usamos tus datos con fines publicitarios ni los vendemos a terceros.</p>

<h2>Con quién los compartimos</h2>
<p>Con los proveedores que hacen posible la app, cada uno solo con lo que necesita para su función:</p>
<ul>
  <li><strong>Supabase</strong> — base de datos y autenticación.</li>
  <li><strong>Render</strong> — alojamiento del servidor.</li>
  <li><strong>Expo / EAS</strong> — actualizaciones de la app y entrega de notificaciones push (vía Firebase Cloud Messaging en Android).</li>
</ul>
<p>Ninguno de ellos usa tus datos para sus propios fines; solo prestan el servicio técnico que contratamos.</p>

<h2>Cuánto tiempo se conservan</h2>
<p>Mientras tu cuenta esté activa. Si quieres eliminar tu cuenta y todos tus datos, escríbenos (ver más abajo) y lo haremos.</p>

<h2>Tus derechos</h2>
<p>Puedes pedirnos en cualquier momento acceder a tus datos, corregirlos o eliminarlos por completo.</p>

<h2>Contacto</h2>
<p>Para cualquier duda sobre esta política o tus datos: <a href="mailto:contacto@overlevel.app">contacto@overlevel.app</a></p>
</body>
</html>`;
