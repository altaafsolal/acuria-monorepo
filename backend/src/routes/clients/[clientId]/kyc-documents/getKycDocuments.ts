import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const { kycDocsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = reqParam(req, 'clientId');
  const documents = await kycDocsRepo.listKycDocumentsByClient(tenantId, clientId);
  res.json({ documents });
}));

export default router;
