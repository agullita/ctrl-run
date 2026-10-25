# Ctrl+run

**Apaga el ego. Enciende el control.**

MVP de telemetría fisiológica: conecta Suunto, calibra tus zonas por Karvonen y audita la precisión de tu frecuencia cardíaca segundo a segundo. No premia el esfuerzo bruto; premia la obediencia al micro-pasillo central de la zona.

- **Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Supabase y Suunto Cloud API.
- **Demo online:** <https://ctrl-run-chi.vercel.app>
- **Repositorio:** <https://github.com/agullita/ctrl-run>
- **Modo demo:** sin credenciales de Suunto usa una actividad local de 45 minutos y permite probar todo el flujo.

## Arranque rápido

```bash
npm install
npm run dev
```

Flujo:

1. Landing → **Sincronizar con Suunto**.
2. Onboarding Karvonen → introduce **FCM** y **FCR**.
3. Panel → selecciona la zona de la misión: Z1–Z5.
4. **Sincronizar última actividad**.
5. El Árbitro calcula los puntos y abre el informe.

Comandos:

```bash
npm run dev
npm run build
npm run typecheck
npm test
npm run preview
```

## Importación de archivos

Ruta `/importar`, disponible también desde el panel. Permite auditar una actividad sin Suunto ni OAuth:

- `.fit` mediante Garmin FIT SDK (carga diferida).
- `.tcx` y `.gpx` mediante parser XML local.
- `.csv` con columnas `time,bpm`.

El archivo se procesa en el navegador. Solo se persisten el informe y sus métricas. La zona activa (Z1–Z5) se elige antes de auditar.

## Motor de precisión

Para la zona seleccionada, el motor calcula:

```text
target_bpm = round((zone_min + zone_max) / 2)
```

Por cada muestra de 1 Hz:

- Antes de penalizar se aplica un **Grace Period de 15 segundos continuados** fuera de zona. Los picos cortos no restan puntos.
- Al superar esos 15 segundos, la penalización empieza a aplicarse segundo a segundo.

| Situación | Cálculo |
| --- | --- |
| Dentro de la Sweet Band (±2 latidos del centro) | `+10` |
| Dentro de la zona, fuera de la Sweet Band | `+5` |
| Por encima de `zone_max` | `-(bpm - zone_max) × 5` |
| Por debajo de `zone_min` | `-(zone_min - bpm) × 2` |

El motor suma/resta puntos brutos por segundo. Para la UI, la puntuación se normaliza sobre el máximo teórico y se limita al rango **0000–1000**; nunca se muestran puntuaciones negativas. El informe muestra:

- Marcador normalizado `0000 / 1000`.
- Penalización bruta aplicada.
- Tiempo en zona y tiempo dentro de la Sweet Band.
- Top 5 fallos de ego de más de 10 segundos; el resto del ruido se oculta.
- Alerta de ego sostenido si se supera `zone_max` durante más de 30 segundos.

Los umbrales de veredicto se aplican sobre el marcador 0–1000: `>900` control quirúrgico, `600–900` fugas de control, `<600` ego desbocado.

## Onboarding fisiológico

La app admite dos métodos:

- **Karvonen:** calcula las cinco zonas desde FCM y FCR.
- **Manual / LTHR:** guarda directamente los límites de Z2 configurados en el reloj. En este modo solo Z2 está disponible.

Karvonen usa:

```text
FC Reserva = FCM - FCR
Z1 = 50–60 %
Z2 = 60–70 %
Z3 = 70–80 %
Z4 = 80–90 %
Z5 = 90–100 %
```

Se guardan el método, `hr_max`, `hr_rest` y los 10 límites de zona en Supabase (o en localStorage si no hay sesión remota).

## Suunto OAuth2

La app usa los endpoints oficiales:

- Autorización: `https://cloudapi-oauth.suunto.com/oauth/authorize`
- Token: `https://cloudapi-oauth.suunto.com/oauth/token`
- API: `https://cloudapi.suunto.com`

El callback es `/auth/suunto/callback`. El intercambio de `code` y el `refresh_token` se realizan en la Edge Function `suunto-oauth`. El Client Secret nunca se expone al navegador.

La sincronización usa `suunto-sync`:

1. `GET /v3/workouts?limit=1`
2. `GET /v3/workouts/{workoutKey}?extensions=HeartrateStreamExtension,SummaryExtension`
3. Normaliza los `points` de la extensión de pulso a muestras de 1 Hz.

La API de Suunto requiere la cabecera `Ocp-Apim-Subscription-Key`; se configura solo como secreto del servidor.

## Supabase

### 1. Autenticación

Activa **Anonymous Sign-Ins** en Supabase Dashboard → Authentication → Sign In / Providers. Ctrl+run crea una sesión anónima para vincular el perfil y los tokens sin pedir registro.

### 2. Migración

Aplica `supabase/migrations/202610250001_suunto_precision.sql` desde el SQL Editor o con la CLI.

Tablas creadas:

- `public.profiles`: `id`, `hr_max`, `hr_rest`, `z1_min`…`z5_max`.
- `public.suunto_tokens`: tokens de Suunto, solo accesibles con `service_role`.
- `public.precision_runs`: histórico de auditorías y snapshots de configuración.

RLS limita perfiles y auditorías al usuario autenticado. `suunto_tokens` no tiene políticas de cliente.

### 3. Edge Functions

```bash
supabase functions deploy suunto-oauth
supabase functions deploy suunto-sync
```

Secretos del servidor:

```bash
supabase secrets set \
  SUUNTO_CLIENT_ID=... \
  SUUNTO_CLIENT_SECRET=... \
  SUUNTO_REDIRECT_URI=https://TU_DOMINIO/auth/suunto/callback \
  SUUNTO_SUBSCRIPTION_KEY=... \
  SUUNTO_API_BASE=https://cloudapi.suunto.com
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`/`SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY` los inyecta el runtime de Supabase.

### 4. Cliente

Copia `.env.example` a `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_SUUNTO_CLIENT_ID=...
VITE_SUUNTO_REDIRECT_URI=http://localhost:5173/auth/suunto/callback
VITE_SUUNTO_DEMO_MODE=false
```

Con `VITE_SUUNTO_DEMO_MODE=true` o sin Client ID, la app usa el stream demo.

## Vercel

- Producción: <https://ctrl-run-chi.vercel.app>
- El repositorio está conectado; cada push a `master` despliega.
- Para OAuth real, actualiza `VITE_SUUNTO_REDIRECT_URI` y `SUUNTO_REDIRECT_URI` a `https://TU_DOMINIO/auth/suunto/callback`.
- Registra ese mismo dominio en la configuración OAuth de Suunto.
- Reconstruye el deployment después de cambiar variables.

## Estructura

```text
src/
  components/     UI, telemetría, gráfica, gauge, score, modal Suunto
  context/        perfil, sesión Suunto, sync y motor
  lib/            zones, scoring, Suunto, Supabase, fileImport, mock
  pages/          Landing, Onboarding, Dashboard, Import, Referee, Callback
supabase/
  migrations/     perfiles, tokens, auditorías
  functions/
    suunto-oauth/ intercambio y refresco de tokens
    suunto-sync/  workouts + HeartrateStreamExtension
```
