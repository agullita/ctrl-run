/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUUNTO_CLIENT_ID?: string
  readonly VITE_SUUNTO_REDIRECT_URI?: string
  readonly VITE_SUUNTO_DEMO_MODE?: string
  readonly VITE_SUUNTO_AUTH_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
