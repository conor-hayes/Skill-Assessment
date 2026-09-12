/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENABLE_AI_HUB: string;
  readonly VITE_PROPERTY_REGISTRY_ADDRESS?: string;
  readonly VITE_AMOY_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
