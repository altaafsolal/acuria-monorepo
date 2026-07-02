import SecretValue from '../ui/SecretValue';
import type { Tenant } from '../../types';

interface TenantProvisioningDetailsProps {
  tenant: Tenant;
}

export default function TenantProvisioningDetails({ tenant }: TenantProvisioningDetailsProps) {
  const hasAny = tenant.workspaceId || tenant.databaseId || tenant.databaseToken;

  if (!hasAny) {
    return (
      <p className="tenant-provisioning__empty">Aucune information Baserow disponible pour ce tenant.</p>
    );
  }

  return (
    <div>
      <p className="tenant-provisioning__title">Provisioning Baserow</p>
      <div className="tenant-provisioning__fields">
        <SecretValue label="Workspace ID" value={tenant.workspaceId} />
        <SecretValue label="Database ID" value={tenant.databaseId} />
        <SecretValue label="Database token" value={tenant.databaseToken} />
      </div>
    </div>
  );
}
