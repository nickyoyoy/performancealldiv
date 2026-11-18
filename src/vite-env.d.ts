/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CRM_API_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_SHOPEE_TABLE?: string;
  readonly VITE_SUPABASE_TIKTOK_TABLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
