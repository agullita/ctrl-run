/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_STRAVA_CLIENT_ID?: string
  readonly VITE_STRAVA_REDIRECT_URI?: string
  readonly VITE_STRAVA_DEMO_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
