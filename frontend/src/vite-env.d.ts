/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Slug of the tenant this deployment is locked to. Default 'ACURIA' = the
   *  standard multi-tenant Acuria platform (no restriction). Any other value turns
   *  the app into a single-tenant white-label portal: only that tenant's users
   *  (plus super admins) may sign in, and the login page shows that tenant's brand. */
  readonly VITE_TENANT_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
