import {
  createDatabaseApplication,
  createWorkspace,
  createWorkspaceDatabaseToken,
} from './api.js';

export interface TenantWorkspaceProvision {
  workspaceId: string;
  databaseId: string;
  databaseToken: string;
}

/**
 * Creates a dedicated Baserow workspace + database + API token for a tenant.
 * Each client tenant is isolated in its own workspace (not the Acuria main workspace).
 */
export async function provisionTenantWorkspace(displayName: string): Promise<TenantWorkspaceProvision> {
  const workspace = await createWorkspace(displayName);
  const workspaceId = String(workspace.id);
  const database = await createDatabaseApplication(workspaceId, displayName);
  const databaseId = String(database.id);
  const databaseToken = await createWorkspaceDatabaseToken(workspaceId, `${displayName} API`);
  return { workspaceId, databaseId, databaseToken };
}
