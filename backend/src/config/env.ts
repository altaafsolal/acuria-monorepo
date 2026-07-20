import 'dotenv/config';

export interface Env {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  appUrl: string;
  /** Public origin of THIS API, including the /api prefix. The Microsoft OAuth
   *  redirect URI must hit the backend, not the SPA — hence separate from appUrl. */
  apiBaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  corsOrigins: string[];
  superAdmin: {
    email: string;
    password: string;
    name: string;
  };
  baserow: {
    apiUrl: string;
    databaseToken: string;
    mainDatabaseId: string;
    workspaceId: string;
    usersTableId: string;
    tenantsTableId: string;
    email: string;
    password: string;
  };
  make: {
    webhookDer: string; // Scénario 6 — DER → Google Docs PDF → email
    webhookLdm: string; // Scénario 7 — LdM → Dropbox → DocuSign
    webhookDerDocusign: string; // Scénario 5 — DER → DocuSign (MAKE_WEBHOOK_DER_DOCUSIGN)
    webhookPreview: string; // LdM preview (returns PDF blob)
    webhookFccSend: string; // Send FCC prefill link by email (MAKE_WH4 / noydem1a…)
    webhookFccSubmit: string; // FCC form data → Make (MAKE_WEBHOOK_URL in DemoFinance form)
    webhookFccDocusign: string; // Send FCC PDF to DocuSign (DOCUSIGN_WEBHOOK / c7nl9jij…)
    webhookNoteUpload: string; // Note attachment → Make → SharePoint (MAKE_WEBHOOK_NOTE_UPLOAD)
    webhookPasswordSet: string;
    webhookOtp: string;
  };
  kyc: {
    derTemplateId: string;
    ldmTemplatePpSans: string;
    ldmTemplatePpAvec: string;
    ldmTemplatePmSans: string;
    ldmTemplatePmAvec: string;
  };
  airtable: {
    pat: string;
    baseId: string;
    tableClients: string;
    tableRelations: string;
    tableKycDocs: string;
    tableGestionnaires: string;
    tableNotes: string;
    tableTasks: string;
    tableFccClients: string;
  };
  /** Multitenant Microsoft Entra ID app registration — drives per-tenant SharePoint
   *  OAuth AND Microsoft-365 email (same app; Mail.Send added as a delegated scope). */
  azure: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  /** Google Cloud OAuth client — drives per-tenant Gmail sending (gmail.send). */
  google: {
    clientId: string;
    clientSecret: string;
  };
  /** Callback both email providers redirect to after consent. Registered on BOTH the
   *  Azure app and the Google OAuth client. Provider is carried in the signed state. */
  emailRedirectUri: string;
  /** 64 hex chars (32 bytes). Encrypts OAuth tokens at rest. See utils/crypto.ts. */
  tokenEncryptionKey: string;
  webhookSecret: string; // Shared secret for inbound webhooks from Make (Authorization header)
  /** Signs the FCC prefill token that binds a public /fcc/submit call to a
   *  tenant + client record. Falls back to the JWT access secret if unset. */
  fccPrefillSecret: string;
}

const port = Number(process.env.PORT) || 3001;

const apiBaseUrl = (
  process.env.API_BASE_URL || `http://localhost:${port}/api`
).replace(/\/$/, "");

export const env: Env = {
  port,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",

  appUrl: (
    process.env.APP_URL ||
    (process.env.CORS_ORIGINS || "http://localhost:4001")
      .split(",")[0]
      ?.trim() ||
    "http://localhost:4001"
  ).replace(/\/$/, ""),

  apiBaseUrl,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:4001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  superAdmin: {
    email: (
      process.env.SUPER_ADMIN_EMAIL || "admin@acuria.partners"
    ).toLowerCase(),
    password: process.env.SUPER_ADMIN_PASSWORD || "admin123",
    name: process.env.SUPER_ADMIN_NAME || "Super Admin",
  },

  baserow: {
    apiUrl: (process.env.BASEROW_API_URL || "https://api.baserow.io").replace(
      /\/$/,
      "",
    ),
    databaseToken:
      process.env.BASEROW_DATABASE_TOKEN ||
      process.env.BASEROW_MASTER_TOKEN ||
      "",
    mainDatabaseId: process.env.BASEROW_MAIN_DATABASE_ID || "473304",
    workspaceId: process.env.BASEROW_WORKSPACE_ID || "",
    usersTableId: process.env.BASEROW_USERS_TABLE_ID || "",
    tenantsTableId: process.env.BASEROW_TENANTS_TABLE_ID || "",
    email: process.env.BASEROW_EMAIL || "",
    password: process.env.BASEROW_PASSWORD || "",
  },

  make: {
    webhookDer: process.env.MAKE_WEBHOOK_DER || "",
    webhookLdm: process.env.MAKE_WEBHOOK_LDM || "",
    webhookDerDocusign: process.env.MAKE_WEBHOOK_DER_DOCUSIGN || "",
    webhookPreview: process.env.MAKE_WEBHOOK_PREVIEW || "",
    webhookFccSend: process.env.MAKE_WEBHOOK_FCC_SEND || "",
    webhookFccSubmit: process.env.MAKE_WEBHOOK_FCC_SUBMIT || "",
    webhookFccDocusign: process.env.MAKE_WEBHOOK_FCC_DOCUSIGN || "",
    webhookNoteUpload: process.env.MAKE_WEBHOOK_NOTE_UPLOAD || "",
    webhookPasswordSet: process.env.MAKE_WEBHOOK_PASSWORD_SET || "",
    webhookOtp: process.env.MAKE_WEBHOOK_OTP || "",
  },

  kyc: {
    derTemplateId: process.env.GOOGLE_DOC_DER_ID || "",
    ldmTemplatePpSans: process.env.GOOGLE_DOC_LDM_PP_SANS || "",
    ldmTemplatePpAvec: process.env.GOOGLE_DOC_LDM_PP_AVEC || "",
    ldmTemplatePmSans: process.env.GOOGLE_DOC_LDM_PM_SANS || "",
    ldmTemplatePmAvec: process.env.GOOGLE_DOC_LDM_PM_AVEC || "",
  },

  airtable: {
    pat: process.env.AIRTABLE_PAT || "",
    baseId: process.env.AIRTABLE_BASE_ID || "",
    tableClients: process.env.AIRTABLE_TABLE_CLIENTS || "NM - Clients",
    tableRelations:
      process.env.AIRTABLE_TABLE_RELATIONS || "NM - Relation clients",
    tableKycDocs: process.env.AIRTABLE_TABLE_KYC_DOCS || "NM - Documents KYC",
    tableGestionnaires:
      process.env.AIRTABLE_TABLE_GESTIONNAIRES || "tblatPVdokDBqRUjh",
    tableNotes: process.env.AIRTABLE_TABLE_NOTES || "tblHFssvCt0EMZfsa",
    tableTasks: process.env.AIRTABLE_TABLE_TASKS || "tblknqykhXNfQzT9P",
    tableFccClients: process.env.AIRTABLE_TABLE_FCC_CLIENTS || "FCC_Clients",
  },

  azure: {
    clientId: process.env.AZURE_CLIENT_ID || "",
    clientSecret: process.env.AZURE_CLIENT_SECRET || "",
    redirectUri:
      process.env.AZURE_REDIRECT_URI ||
      `${apiBaseUrl}/oauth/sharepoint/callback`,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },

  emailRedirectUri:
    process.env.EMAIL_REDIRECT_URI || `${apiBaseUrl}/oauth/email/callback`,

  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || "",

  webhookSecret: process.env.WEBHOOK_SECRET || "",

  fccPrefillSecret:
    process.env.FCC_PREFILL_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    "dev-access-secret",
};

/**
 * Refuse to boot in production with placeholder/blank secrets. These defaults
 * exist only so `npm run dev` and the test suite work without a full .env; if any
 * of them survive into a production process, tokens are forgeable and the super
 * admin is guessable. Fail loudly at startup rather than silently run insecure.
 */
const WEAK_DEFAULTS: Record<string, string> = {
  JWT_ACCESS_SECRET: "dev-access-secret",
  JWT_REFRESH_SECRET: "dev-refresh-secret",
  SUPER_ADMIN_PASSWORD: "admin123",
};

export function assertProductionSecrets(): void {
  if (!env.isProduction) return;

  const problems: string[] = [];
  const check = (name: string, value: string, weak?: string): void => {
    if (!value) problems.push(`${name} is not set`);
    else if (weak && value === weak)
      problems.push(`${name} is set to the insecure default`);
  };

  check(
    "JWT_ACCESS_SECRET",
    env.jwt.accessSecret,
    WEAK_DEFAULTS.JWT_ACCESS_SECRET,
  );
  check(
    "JWT_REFRESH_SECRET",
    env.jwt.refreshSecret,
    WEAK_DEFAULTS.JWT_REFRESH_SECRET,
  );
  check(
    "SUPER_ADMIN_PASSWORD",
    env.superAdmin.password,
    WEAK_DEFAULTS.SUPER_ADMIN_PASSWORD,
  );
  check("WEBHOOK_SECRET", env.webhookSecret);
  check("TOKEN_ENCRYPTION_KEY", env.tokenEncryptionKey);

  if (env.jwt.accessSecret === env.jwt.refreshSecret) {
    problems.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to start in production — insecure configuration:\n  - ${problems.join("\n  - ")}`,
    );
  }
}

export function isBaserowConfigured(): boolean {
  return Boolean(env.baserow.databaseToken && env.baserow.mainDatabaseId);
}

export function isBaserowMigrateConfigured(): boolean {
  return Boolean(
    env.baserow.email
    && env.baserow.password
    && env.baserow.mainDatabaseId,
  );
}

export function isAzureConfigured(): boolean {
  return Boolean(env.azure.clientId && env.azure.clientSecret && env.azure.redirectUri);
}

/** Microsoft-365 email reuses the Azure app; only the email redirect URI differs. */
export function isMicrosoftEmailConfigured(): boolean {
  return Boolean(env.azure.clientId && env.azure.clientSecret && env.emailRedirectUri);
}

export function isGoogleEmailConfigured(): boolean {
  return Boolean(env.google.clientId && env.google.clientSecret && env.emailRedirectUri);
}
