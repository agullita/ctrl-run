# Ctrl+run

**Apaga el ego. Enciende el control.**

MVP single-player de un árbitro fisiológico: conecta Strava, recibe una misión de frecuencia cardíaca y deja que el motor audite el stream de pulso segundo a segundo. No registra entrenamientos: los juzga.

- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts + Supabase + Strava API.
- **Estética:** terminal brutalista, JetBrains Mono + Space Grotesk, verde señal `#39ff14`, rojo sangre `#b30000`.
- **Estado actual:** flujo demo funcional de punta a punta. Sin variables de entorno, corre con un stream mock determinista de 40 minutos que puntúa **850/1000** y activa la alerta de redline.

## Arranque rápido

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173`.

Flujo de prueba:

1. `Sincronizar con Strava` → handshake OAuth2 simulado.
2. Panel → `Sincronizar última actividad`.
3. El motor procesa 2.400 muestras a 1 Hz y abre la vista del árbitro.

Comandos:

```bash
npm run dev        # Vite
npm run build      # typecheck + build de producción
npm run typecheck  # tsc --noEmit
npm test           # Vitest: scoring + normalización Strava
npm run preview    # preview del build
npm run seed:sql   # regenera supabase/seed.sql desde el mock
```

## Rutas

| Ruta | Vista |
| --- | --- |
| `/` | Landing + manifiesto + handshake OAuth2 |
| `/panel` | Misión 01 / El Monje + sincronización |
| `/arbitro` | Puntuación, gráfica, alertas y desglose |
| `/auth/strava` | Callback OAuth2 real (Edge Function) |

## Algoritmo de precisión

Configuración por defecto en `src/lib/scoring.ts`:

| Regla | Valor |
| --- | --- |
| Puntuación base | 1000 |
| Diana estricta | 125–135 bpm |
| Por segundo en diana | 0 puntos |
| Por segundo > 135 bpm (ego) | −2 puntos |
| Por segundo < 125 bpm (déficit) | −1 punto |
| Redline | > 145 bpm |
| Alerta de disciplina | redline continuo > 30 s |

El stream se normaliza a 1 muestra por segundo (interpolación si Strava entrega timestamps irregulares). Se calculan ventanas contiguas de exceso/déficit, tiempo en diana, pico, duración, puntos perdidos y `egoAlert`.

Veredictos:

- `> 900`: **Control quirúrgico. Has dominado el ego.**
- `600–900`: **Fugas de control. Te has dejado llevar en las cuestas.**
- `< 600`: **Ego desbocado. Entrenamiento fallido. Has corrido para la galería, no para tu corazón.**

## Supabase (mock en base de datos)

1. Creá un proyecto en Supabase.
2. Ejecutá `supabase/migrations/202610220001_init.sql` en el SQL Editor.
3. Regenerá el seed con `npm run seed:sql` y ejecutá `supabase/seed.sql` (inserta la actividad demo + 2.400 muestras de pulso).
4. Copiá `.env.example` a `.env.local` y completá:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

5. Reiniciá Vite. El panel mostrará `SUPABASE // REMOTE` y `activityRepository` leerá la actividad desde `activities` + `activity_streams`. Si Supabase falla o no está configurado, cae automáticamente al mock local.

Tablas: `activities`, `activity_streams`, `evaluations`. RLS de demo habilitado para lectura pública de la actividad demo e inserción de evaluaciones.

## Strava OAuth2 real

La integración ya está preparada; el modo demo es el default.

1. Creá una app en <https://www.strava.com/settings/api>.
2. Authorization Callback Domain: `localhost` (desarrollo).
3. Configurá `.env.local`:

```env
VITE_STRAVA_CLIENT_ID=tu_client_id
VITE_STRAVA_REDIRECT_URI=http://localhost:5173/auth/strava
VITE_STRAVA_DEMO_MODE=false
```

4. Desplegá la Edge Function y configurá los secretos:

```bash
supabase functions deploy strava
supabase secrets set STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=...
```

5. Sin `VITE_SUPABASE_URL`/`ANON_KEY` el callback no puede canjear el código. El client secret nunca se expone al navegador.

La Edge Function consulta:

- `GET /api/v3/athlete/activities?per_page=1`
- `GET /api/v3/activities/{id}/streams?keys=time,heartrate&key_by_type=true`

El frontend normaliza la respuesta antes de puntuar.

## Variables de entorno

| Variable | Ámbito | Uso |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | cliente | proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | cliente | lectura demo / edge functions |
| `VITE_STRAVA_CLIENT_ID` | cliente | URL OAuth2 |
| `VITE_STRAVA_REDIRECT_URI` | cliente | callback (`/auth/strava`) |
| `VITE_STRAVA_DEMO_MODE` | cliente | `true` simula el handshake |
| `STRAVA_CLIENT_ID` | Edge Function | canje de token |
| `STRAVA_CLIENT_SECRET` | Edge Function | canje de token |
| `STRAVA_REDIRECT_URI` | Edge Function | coherencia OAuth2 |

## Estructura

```
src/
  components/     UI, logo, gráfica, telemetría, botones
  context/        RunContext (sync, sesión, errores)
  lib/            scoring, mock, Supabase, Strava, formato
  pages/          Landing, Dashboard, Referee, AuthCallback
supabase/
  migrations/     esquema + RLS
  seed.sql        actividad demo + stream
  functions/      edge function de canje OAuth2
```
