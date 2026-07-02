import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../../../utils/index.js';

const { relationsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = reqParam(req, 'clientId');
  const { clientBId, typeRelation, pctDetention, note } = req.body as {
    clientBId?: string;
    typeRelation?: string;
    pctDetention?: number;
    note?: string;
  };

  if (!clientBId || !typeRelation) {
    throw new HttpError(400, 'clientBId and typeRelation are required');
  }

  const relation = await relationsRepo.createRelation(tenantId, {
    clientAId: clientId,
    clientBId,
    typeRelation,
    pctDetention,
    note,
  });
  res.status(201).json({ relation });
}));

export default router;
