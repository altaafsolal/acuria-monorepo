/**
 * Single-tenant / white-label deployment configuration.
 *
 * `VITE_TENANT_SLUG` pins a build to one tenant. Its default sentinel is 'ACURIA',
 * which means "the standard multi-tenant platform" — no login restriction and the
 * default Acuria branding. Any other value locks the deployment to that tenant slug:
 *   1. Only that tenant's users (plus super admins, who have no tenant) may sign in.
 *   2. The login page is rebranded with that tenant's name / logo / accent.
 */
const DEFAULT_TENANT = 'ACURIA';

/** The configured slug, trimmed. Equals DEFAULT_TENANT when the env is unset. */
export const TENANT_SLUG = (import.meta.env.VITE_TENANT_SLUG ?? DEFAULT_TENANT).trim() || DEFAULT_TENANT;

/** True when this build is locked to a single tenant (i.e. not the default Acuria brand). */
export const IS_SINGLE_TENANT = TENANT_SLUG.toUpperCase() !== DEFAULT_TENANT;
