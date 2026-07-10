import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { clientsRepo, clientMapper } from '../../services/baserow/index.js';
import { asyncHandler} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.get('/der', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const filter = String(req.query.filter || '');

  const all = clientMapper.excludeArchived(await clientsRepo.listClientsByTenantId(tenantId));
  let clients = all;
  if (filter && filter !== 'all') {
    if (filter === 'non_envoye') clients = all.filter((c) => !c.der_statut || c.der_statut === 'Non envoyé');
    else if (filter === 'envoye') clients = all.filter((c) => c.der_statut === 'Envoyé' || c.ldm_statut === 'Envoyé');
    else if (filter === 'signe') clients = all.filter((c) => c.ldm_statut === 'Signé');
  }

  res.json({ clients: clients.map(clientMapper.toPublicClient) });
}));

export default router;
