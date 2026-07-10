import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../../../middleware/index.js';
import { relationsRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, HttpError,reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
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
