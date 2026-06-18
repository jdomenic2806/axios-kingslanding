/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_LANDING_V2?: string;
  readonly VITE_CDN_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
