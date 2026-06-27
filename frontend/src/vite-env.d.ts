/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEFAULT_ADMIN_KEY: string
  readonly VITE_DEFAULT_API_KEY: string
  readonly VITE_DASHBOARD_REFRESH_INTERVAL: string
  readonly VITE_METRICS_REFRESH_INTERVAL: string
  readonly VITE_HEALTH_REFRESH_INTERVAL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
